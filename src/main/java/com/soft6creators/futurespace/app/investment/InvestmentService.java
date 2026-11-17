package com.soft6creators.futurespace.app.investment;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PathVariable;

import com.soft6creators.futurespace.app.account.Account;
import com.soft6creators.futurespace.app.account.AccountRepository;
import com.soft6creators.futurespace.app.crypto.Crypto;
import com.soft6creators.futurespace.app.crypto.CryptoService;

@Service
public class InvestmentService {

	@Autowired
	private InvestmentRepository investmentRepository;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private CryptoService cryptoService;

	public Investment addInvestment(Investment investment) {
		Crypto crypto = cryptoService.getCryptoByName(investment.getCurrency().getCrypto());
		Optional<Account> account = accountRepository.findById(investment.getAccount().getAccountId());
		if (account.get().getAccountBalance() > 30) {
			Optional<Investment> currentInvestment = investmentRepository
					.findByAccountAccountId(account.get().getAccountId());
			account.get().setAccountBalance(investment.getPercentage());
			accountRepository.save(account.get());
			investment.setCurrency(crypto);
			investment.setActive(true);
			investment.setInvestmentPlan(investment.getInvestmentPlan());
			investment.setInvestmentId(currentInvestment.get().getInvestmentId());
			return investmentRepository.save(investment);
		} else {
			investment.setCurrency(crypto);
			investment.setActive(true);

			if (account.get().getInterestPreference() == null) {
				account.get().setInterestPreference(investment.getCurrency());
				account.get().setInterestPreference(investment.getCurrency());
				accountRepository.save(account.get());
			}
			account.get().setAccountBalance(investment.getInvestedAmount());
			accountRepository.save(account.get());

			return investmentRepository.save(investment);
		}

	}

	public boolean cancelInvestment(int investmentId) {
		Optional<Investment> investment = investmentRepository.findById(investmentId);
		investment.get().setActive(false);
		investmentRepository.save(investment.get());
		return investment.get().isActive();
	}

	public Optional<Investment> getInvestmentByAccount(int accountId) {
		return investmentRepository.findByAccountAccountId(accountId);
	}

	/**
	 * Portfolio roll-up behind the dashboard: how much has been put in, how much
	 * interest that capital has earned so far, and the two added together.
	 *
	 * A plan's "percentage" is its total return over its own "days" term, so
	 * interest accrues pro-rata across the term and stops dead at the end of it --
	 * a finished plan settles at exactly the return it advertised, never more.
	 * A record with no readable start date or no term accrues nothing rather than
	 * guessing at how long it has been running.
	 */
	public Map<String, Object> getAccountSummary(int accountId) {
		List<Investment> investments = investmentRepository.findAllByAccountAccountId(accountId);
		long investedTotal = 0L;
		double accruedInterest = 0D;
		for (Investment investment : investments) {
			investedTotal += investment.getInvestedAmount();
			accruedInterest += accruedFor(investment);
		}

		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("investedTotal", investedTotal);
		summary.put("accruedInterest", accruedInterest);
		summary.put("totalValue", investedTotal + accruedInterest);
		summary.put("positions", investments.size());
		return summary;
	}

	private static double accruedFor(Investment investment) {
		Instant start = toInstant(investment.getStartDate());
		if (start == null || investment.getDays() <= 0) {
			return 0D;
		}
		long elapsedDays = ChronoUnit.DAYS.between(start, Instant.now());
		if (elapsedDays <= 0) {
			return 0D;
		}
		/* Past the end of the term the accrual is capped, not compounded. */
		double progress = Math.min(1D, (double) elapsedDays / (double) investment.getDays());
		return investment.getInvestedAmount() * (investment.getPercentage() / 100D) * progress;
	}

	/**
	 * Same lenient reading as TransactionController: an {@link Instant} string
	 * from the JPA side, or a moment.js string carrying its own offset, or a
	 * bare local date-time taken as UTC.
	 */
	private static Instant toInstant(String value) {
		if (value == null || value.trim().isEmpty()) return null;
		String text = value.trim();
		try {
			return Instant.parse(text);
		} catch (RuntimeException ignored) {
		}
		try {
			return OffsetDateTime.parse(text).toInstant();
		} catch (RuntimeException ignored) {
		}
		try {
			return LocalDateTime.parse(text).toInstant(ZoneOffset.UTC);
		} catch (RuntimeException ignored) {
		}
		return null;
	}

	public Optional<Investment> getInvestMent(int investmentId) {
		return investmentRepository.findById(investmentId);
	}

	public boolean investmentComplete(int investmentId, int roi) {
		Optional<Investment> investment = investmentRepository.findById(investmentId);
		investment.get().setActive(false);
		investmentRepository.save(investment.get());
		Optional<Account> account = accountRepository.findById(investment.get().getAccount().getAccountId());
		account.get().setAccountBalance(roi);
		accountRepository.save(account.get());
		return true;
	}

	public List<Investment> getInvestments() {
		return (List<Investment>) investmentRepository.findAll();
	}
}
