package com.soft6creators.futurespace.app.investment;

import java.util.LinkedHashMap;
import java.util.Locale;
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

	/**
	 * The three plans this platform runs, with the rate and the minimum each
	 * one is published at on the dashboard. A booking for anything else is
	 * refused rather than stored and shown to the member as a plan that does
	 * not exist.
	 */
	private static final Map<String, Integer> PLAN_RATES = new LinkedHashMap<>();
	private static final Map<String, Integer> PLAN_MINIMUMS = new LinkedHashMap<>();
	static {
		PLAN_RATES.put("Silver Plan", 70);
		PLAN_RATES.put("Gold Plan", 75);
		PLAN_RATES.put("Diamond Plan", 80);
		PLAN_MINIMUMS.put("Silver Plan", 200);
		PLAN_MINIMUMS.put("Gold Plan", 2000);
		PLAN_MINIMUMS.put("Diamond Plan", 10000);
	}

	@Autowired
	private InvestmentRepository investmentRepository;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private CryptoService cryptoService;

	/**
	 * Accepts "Silver", "silver plan" or "SILVER PLAN" and returns the name the
	 * dashboard renders; null means the booking is for a plan we do not run.
	 */
	private static String canonicalPlan(String name) {
		if (name == null) return null;
		String wanted = name.trim().toLowerCase().replaceAll("\\s+plan$", "");
		if (wanted.isEmpty()) return null;
		for (String plan : PLAN_RATES.keySet()) {
			String canonical = plan.toLowerCase().replaceAll("\\s+plan$", "");
			if (canonical.equals(wanted)) return plan;
		}
		return null;
	}

	public Investment addInvestment(Investment investment) {
		String plan = canonicalPlan(investment.getInvestmentPlan());
		if (plan == null) {
			throw new IllegalArgumentException(
					"Only the Silver, Gold and Diamond plans can be booked.");
		}
		investment.setInvestmentPlan(plan);

		int amount = investment.getInvestedAmount();
		if (amount <= 0) {
			throw new IllegalArgumentException("Enter an amount greater than zero.");
		}
		int minimum = PLAN_MINIMUMS.get(plan).intValue();
		if (amount < minimum) {
			throw new IllegalArgumentException(plan + " starts at $"
					+ String.format(Locale.US, "%,d", minimum)
					+ ". Enter at least that much.");
		}
		/* The operator states the percentage; when none is carried over it
		   defaults to the rate published for the chosen plan. */
		if (investment.getPercentage() <= 0) {
			investment.setPercentage(PLAN_RATES.get(plan).intValue());
		}

		/* An account keeps one position. A further deposit joins the capital
		   already booked rather than replacing it, so "capital invested" on the
		   dashboard, the balance and the interest all move together. The plan
		   and the rate shown are those of the latest booking. */
		Optional<Investment> currentInvestment = investmentRepository
				.findByAccountAccountId(investment.getAccount().getAccountId());
		int bookedSoFar = currentInvestment.isPresent()
				? currentInvestment.get().getInvestedAmount()
				: 0;
		investment.setInvestedAmount(amount + bookedSoFar);

		Crypto crypto = cryptoService.getCryptoByName(investment.getCurrency().getCrypto());
		Optional<Account> account = accountRepository.findById(investment.getAccount().getAccountId());
		if (account.get().getAccountBalance() > 30) {
			/* An account that already holds capital is being deposited into, so
			   the balance grows by what was just booked. It used to be
			   overwritten with the plan's rate here -- booking a Diamond
			   deposit left the account at $80. */
			account.get().setAccountBalance(
					account.get().getAccountBalance() + amount);
			accountRepository.save(account.get());
			investment.setCurrency(crypto);
			investment.setActive(true);
			if (currentInvestment.isPresent()) {
				investment.setInvestmentId(currentInvestment.get().getInvestmentId());
			}
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
	 * Portfolio roll-up behind the dashboard: how much has been put in, the
	 * return stated against it, and the two added together.
	 *
	 * Nothing here is worked out over time. An investment is booked by hand with
	 * the return the operator chooses to state, so that figure is the interest:
	 * principal times the stated percentage, and nothing else. The pro-rating
 * over a term was deliberately left out until it is asked for.
	 */
	public Map<String, Object> getAccountSummary(int accountId) {
		List<Investment> investments = investmentRepository.findAllByAccountAccountId(accountId);
		long investedTotal = 0L;
		double accruedInterest = 0D;
		for (Investment investment : investments) {
			investedTotal += investment.getInvestedAmount();
			accruedInterest += investment.getInvestedAmount() * (investment.getPercentage() / 100D);
		}

		Map<String, Object> summary = new LinkedHashMap<>();
		summary.put("investedTotal", investedTotal);
		summary.put("accruedInterest", accruedInterest);
		summary.put("totalValue", investedTotal + accruedInterest);
		summary.put("positions", investments.size());
		return summary;
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
