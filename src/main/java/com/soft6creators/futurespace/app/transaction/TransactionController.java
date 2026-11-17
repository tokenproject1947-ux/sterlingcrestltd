package com.soft6creators.futurespace.app.transaction;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.soft6creators.futurespace.app.crypto.Crypto;
import com.soft6creators.futurespace.app.investment.Investment;
import com.soft6creators.futurespace.app.investment.InvestmentRepository;
import com.soft6creators.futurespace.app.user.User;
import com.soft6creators.futurespace.app.user.UserService;
import com.soft6creators.futurespace.app.withdrawal.Withdrawal;
import com.soft6creators.futurespace.app.withdrawal.WithdrawalRepository;

/**
 * The signed-in member's money ledger: every deposit booked against the
 * account merged with every withdrawal requested from it, newest first.
 *
 * Deposits have no table of their own in this application -- a deposit is
 * recorded by booking an Investment for the account -- so this is the one
 * place the two movements are joined into a single list.
 *
 * Rows are deliberately a trimmed projection rather than the entities: both
 * carry a ManyToOne back to User, which would push the account password into
 * the response.
 */
@RestController
public class TransactionController {

	@Autowired
	private UserService userService;
	@Autowired
	private InvestmentRepository investmentRepository;
	@Autowired
	private WithdrawalRepository withdrawalRepository;

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/user/{userEmail}/transactions")
	public List<Map<String, Object>> getTransactions(@PathVariable("userEmail") String userEmail) {
		List<Map<String, Object>> rows = new ArrayList<>();

		Optional<User> user = userService.getUser(userEmail);
		if (user.isPresent() && user.get().getAccount() != null) {
			Optional<Investment> investment = investmentRepository
					.findByAccountAccountId(user.get().getAccount().getAccountId());
			if (investment.isPresent()) {
				Investment booked = investment.get();
				Map<String, Object> row = new LinkedHashMap<>();
				row.put("type", "Deposit");
				row.put("label", booked.getInvestmentPlan());
				row.put("amount", booked.getInvestedAmount());
				/* Money reached the account, so the deposit itself settled. */
				row.put("status", "Successful");
				row.put("date", booked.getStartDate());
				rows.add(row);
			}
		}

		for (Withdrawal withdrawal : withdrawalRepository.findAllByUserEmail(userEmail)) {
			Map<String, Object> row = new LinkedHashMap<>();
			row.put("type", "Withdrawal");

			/* The rail the member picked; older rows predate that column. */
			String label = withdrawal.getMethod();
			if (label == null) {
				Crypto asset = withdrawal.getCrypto();
				if (asset != null) {
					label = asset.getCrypto();
				}
			}
			row.put("label", label);
			row.put("amount", withdrawal.getAmount());
			row.put("status", withdrawal.getWithdrawalStatus());
			row.put("date", withdrawal.getDate());
			/* Where this payout is going, so a member reading the ledger can
			   see the destination they typed was actually recorded. */
			row.put("walletAddress", withdrawal.getWalletAddress());
			rows.add(row);
		}

		Collections.sort(rows, (left, right) -> {
			Instant first = toInstant((String) left.get("date"));
			Instant second = toInstant((String) right.get("date"));
			if (first == null && second == null) return 0;
			/* Undated rows sink to the bottom instead of sorting arbitrarily. */
			if (first == null) return 1;
			if (second == null) return -1;
			return second.compareTo(first);
		});
		return rows;
	}

	/**
	 * Both writers store ISO-8601, but from two different clocks: an
	 * {@link Instant} string from the JPA side ("...Z") and a moment.js string
	 * with a zone offset from the admin side ("...+01:00"). Bare local
	 * date-times are accepted too.
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
}
