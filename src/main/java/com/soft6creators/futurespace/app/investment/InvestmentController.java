package com.soft6creators.futurespace.app.investment;

import java.util.Optional;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.soft6creators.futurespace.app.account.Account;
import com.soft6creators.futurespace.app.account.AccountService;

@RestController
public class InvestmentController {
	@Autowired
	private InvestmentService investmentService;

	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.POST, value = "/investment")
	public ResponseEntity<?> addInvestment(@RequestBody Investment investment) {
		try {
			return ResponseEntity.ok(investmentService.addInvestment(investment));
		} catch (IllegalArgumentException e) {
			/* A booking that breaks the plan rules comes back saying why, so the
			   admin console can show the reason under the form. */
			return ResponseEntity.badRequest().body(e.getMessage());
		}
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/investment/{investmentId}")
	public Optional<Investment> getInvestment(@PathVariable int investmentId) {
		return investmentService.getInvestMent(investmentId);
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/account/{accountId}/investment")
	public Optional<Investment> getInvestmentByAccount(@PathVariable int accountId) {
		return investmentService.getInvestmentByAccount(accountId);
	}

	/**
	 * Capital invested, interest accrued so far, and the two added together.
	 * A trimmed map rather than the entities: an Investment carries a
	 * ManyToOne back to Account and from there to User.
	 */
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/account/{accountId}/portfolio")
	public Map<String, Object> getAccountPortfolio(@PathVariable int accountId) {
		return investmentService.getAccountSummary(accountId);
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/investment/{investmentId}/isactive")
	public boolean cancelInvestment(@PathVariable int investmentId) {
		return investmentService.cancelInvestment(investmentId);
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/investment/{investmentId}/roi/{roi}")
	public boolean investmentComplete(@PathVariable int investmentId, @PathVariable int roi) {
		return investmentService.investmentComplete(investmentId, roi);
	}

        @CrossOrigin(maxAge = 3600)
	@RequestMapping("/investments")
	public List<Investment> getInvestments() {
		return investmentService.getInvestments();
	}
}
