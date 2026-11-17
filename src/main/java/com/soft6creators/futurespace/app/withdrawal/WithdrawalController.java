package com.soft6creators.futurespace.app.withdrawal;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.soft6creators.futurespace.app.crypto.Crypto;

@RestController
public class WithdrawalController {
	@Autowired
	private WithdrawalService withdrawalService;
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.POST, value = "/withdrawal")
	public Withdrawal addWithdrawal(@RequestBody Withdrawal withdrawal) {
		return withdrawalService.addWithdrawal(withdrawal);
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.PUT, value = "/withdrawal")
	public Withdrawal updateWithdrawal(@RequestBody Withdrawal withdrawal) {
		return withdrawalService.addWithdrawal(withdrawal);
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/withdrawal/{withdrawalId}")
	public Optional<Withdrawal> getWithdrawal(@PathVariable int withdrawalId) {
		return withdrawalService.getWithdrawal(withdrawalId);
	}
	
	
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/user/{userEmail}/withdrawal")
	public Optional<Withdrawal> getWithdrawalByUser(@PathVariable String userEmail) {
		return withdrawalService.getWithdrawalByUser(userEmail);
	}
	
	/**
	 * Per-user withdrawal history for the dashboard. Deliberately serialises a
	 * trimmed projection rather than the Withdrawal entity: the entity carries a
	 * ManyToOne back to User, which would push the account password into the
	 * response.
	 */
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/user/{userEmail}/withdrawals")
	public List<Map<String, Object>> getWithdrawalsByUser(@PathVariable("userEmail") String userEmail) {
		List<Map<String, Object>> rows = new ArrayList<>();
		for (Withdrawal withdrawal : withdrawalService.getWithdrawalsByUser(userEmail)) {
			Map<String, Object> row = new LinkedHashMap<>();
			row.put("withdrawalId", withdrawal.getWithdrawalId());
			row.put("amount", withdrawal.getAmount());
			row.put("withdrawalStatus", withdrawal.getWithdrawalStatus());
			row.put("date", withdrawal.getDate());
			row.put("method", withdrawal.getMethod());
			/* Payout destination the member typed on the withdraw page, so the
			   admin console can round-trip it on approve/decline. */
			row.put("walletAddress", withdrawal.getWalletAddress());

			Map<String, Object> crypto = new LinkedHashMap<>();
			Crypto asset = withdrawal.getCrypto();
			if (asset != null) {
				crypto.put("cryptoId", asset.getCryptoId());
				crypto.put("crypto", asset.getCrypto());
				crypto.put("symbol", asset.getSymbol());
			}
			row.put("crypto", crypto);
			rows.add(row);
		}
		return rows;
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/withdrawals/{withdrawalStatus}")
	public List<Withdrawal> getWithdrawalsByWithdrawalStatus(@PathVariable String withdrawalStatus) {
		return withdrawalService.getWithdrawalsByWithdrawalStatus(withdrawalStatus);
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/withdrawals")
	public List<Withdrawal> getWithdrawals() {
		return withdrawalService.getWithdrawals();
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/withdrawal/last")
	public Optional<Withdrawal> getLastWithdrawal() {
		return withdrawalService.getLastWithdrawal();
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/user/{userEmail}/withdrawal/last")
	public Optional<Withdrawal> getLastWithdrawalByUser(@PathVariable String userEmail) {
		return withdrawalService.getLastWithdrawalByUser(userEmail);
	}
}
