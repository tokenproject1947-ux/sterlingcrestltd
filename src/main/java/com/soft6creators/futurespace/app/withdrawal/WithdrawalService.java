package com.soft6creators.futurespace.app.withdrawal;

import java.io.UnsupportedEncodingException;
import java.util.List;
import java.util.Optional;

import javax.mail.MessagingException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.soft6creators.futurespace.app.account.Account;
import com.soft6creators.futurespace.app.account.AccountRepository;
import com.soft6creators.futurespace.app.crypto.Crypto;
import com.soft6creators.futurespace.app.crypto.CryptoRepository;
import com.soft6creators.futurespace.app.mailsender.MailSenderService;

@Service
public class WithdrawalService {
	@Autowired
	private WithdrawalRepository withdrawalRepository;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private MailSenderService mailSenderService;

	@Autowired
	private CryptoRepository cryptoRepository;

	private String email = "jd3818373@gmail.com";

	public Withdrawal addWithdrawal(Withdrawal withdrawal) {
		if (withdrawal.getWithdrawalStatus().contentEquals("Pending")) {
			Optional<Account> account = accountRepository.findById(withdrawal.getUser().getAccount().getAccountId());
			Optional<Crypto> crypto = cryptoRepository.findById(withdrawal.getCrypto().getCryptoId());
			account.get().setAccountBalance(account.get().getAccountBalance() - withdrawal.getAmount());
			accountRepository.save(account.get());
			try {
				sendWithdrawalRequest(withdrawal, crypto.get());
			} catch (UnsupportedEncodingException | MessagingException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		} else if (withdrawal.getWithdrawalStatus().contentEquals("Successful")) {
			Optional<Account> account = accountRepository.findById(withdrawal.getUser().getAccount().getAccountId());
			accountRepository.save(account.get());
			try {
				sendWithdrawalApproval(withdrawal);
			} catch (UnsupportedEncodingException | MessagingException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		} else if (withdrawal.getWithdrawalStatus().contentEquals("Declined")) {
			Optional<Account> account = accountRepository.findById(withdrawal.getUser().getAccount().getAccountId());
			account.get().setAccountBalance(account.get().getAccountBalance() + withdrawal.getAmount());
			accountRepository.save(account.get());
			try {
				sendWithdrawalDeclined(withdrawal);
			} catch (UnsupportedEncodingException | MessagingException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}

		return withdrawalRepository.save(withdrawal);
	}

	public Optional<Withdrawal> getWithdrawal(int withdrawalId) {
		return withdrawalRepository.findById(withdrawalId);
	}

	public Optional<Withdrawal> getWithdrawalByUser(String userEmail) {
		return withdrawalRepository.findByUserEmail(userEmail);
	}

	public List<Withdrawal> getWithdrawalsByWithdrawalStatus(String withdrawalStatus) {
		return (List<Withdrawal>) withdrawalRepository.findAllByWithdrawalStatus(withdrawalStatus);
	}

	public List<Withdrawal> getWithdrawals() {
		return (List<Withdrawal>) withdrawalRepository.findAll();
	}

	public Optional<Withdrawal> getLastWithdrawal() {
		return withdrawalRepository.findTopByOrderByWithdrawalIdDesc();
	}

	public Optional<Withdrawal> getLastWithdrawalByUser(String userEmail) {
		return withdrawalRepository.findTopByUserEmailOrderByWithdrawalIdDesc(userEmail);
	}

	private void sendWithdrawalRequest(Withdrawal withdrawal, Crypto crypto)
			throws UnsupportedEncodingException, MessagingException {
		String toAddress = withdrawal.getUser().getEmail();
		String subject = "Sterling Crest Ltd (Withdrawal Request)";
		String content = "<div id=\"container\" style=\"box-shadow: 1px 1px 10px rgb(236, 236, 236); padding:12px; font-family: Arial, Helvetica, sans-serif;\"><div style=\"padding: 8px 16px; background-color: black; color: white; font-family: Arial, Helvetica, sans-serif;\"><p style=\"font-size: 20px; font-weight: bold;\">Sterling Crest Ltd</p></div><div style=\"padding: 12px; font-family: Arial, Helvetica, sans-serif; margin-top: 0px;\"><p style=\"font-weight: 600; font-size: 18px; color: rgba(0, 33, 124, 0.938);\">Transaction Request</p><p style=\"color: rgba(0, 33, 124, 0.938); font-weight: 600;\">Dear "
				+ withdrawal.getUser().getFullName()
				+ ",</p><p style=\"font-size: 15px; color: rgb(34, 34, 34); line-height: 22px;\">Withdrawal request of <span style=\"font-weight: 600; color: rgba(0, 33, 124, 0.938);\">"
				+ withdrawal.getAmount()
				+ "USD</span> is being processed by the Sterling Crest Ltd Financial Team. Please kindly be patient while we approve your transaction.</p><p style=\"font-size: 15px; color: rgb(34, 34, 34); line-height: 22px;\">Thanks.</p><p style=\"font-size: 14px; font-weight: bold; color: rgb(34, 34, 34)\">Security tips:</p><ol style=\"font-size: 14px; font-weight: bold; padding-left: 20px; color: rgb(54, 54, 54); line-height: 18px;\"><li>Never give your password to anyone</li><li>Never call any phone number for someone claiming to be Sterling Crest Ltd Support</li><li>Never send any money to anyone claiming to be a member of Sterling Crest Ltd team</li><li>Enable Google Two Factor Authentication.</li></ol><p style=\"font-size: 12px; color: rgb(34, 34, 34);\">If you don't recognize this activity, please contact our customer support immediately.</p><p style=\"font-size: 12px; color: rgb(34, 34, 34);\">Sterling Crest Ltd Team</p></div></div>";

		 mailSenderService.sendEmail(toAddress, subject, content);
		 mailSenderService.sendEmail(email, subject, content);

	}

	private void sendWithdrawalApproval(Withdrawal withdrawal) throws UnsupportedEncodingException, MessagingException {
		String toAddress = withdrawal.getUser().getEmail();
		String subject = "Sterling Crest Ltd (Withdrawal Approved)";
		String content = "<div id=\"container\" style=\"box-shadow: 1px 1px 10px rgb(236, 236, 236); padding:12px; font-family: Arial, Helvetica, sans-serif;\"><div style=\"padding: 8px 16px; background-color: black; color: white; font-family: Arial, Helvetica, sans-serif;\"><p style=\"font-size: 20px; font-weight: bold;\">Sterling Crest Ltd</p></div><div style=\"padding: 12px; font-family: Arial, Helvetica, sans-serif; margin-top: 0px;\"><p style=\"font-weight: 600; font-size: 18px; color: rgba(0, 33, 124, 0.938);\">Transaction Successful</p><p style=\"color: rgba(0, 33, 124, 0.938); font-weight: 600;\">Dear "
				+ withdrawal.getUser().getFullName()
				+ ",</p><p style=\"font-size: 15px; color: rgb(34, 34, 34); line-height: 22px;\">Withdrawal request of <span style=\"font-weight: 600; color: rgba(0, 33, 124, 0.938);\">"
				+ withdrawal.getAmount()
				+ "USD</span> has been successfully approved. Kindly confirm your Transaction on your Cryptocurrency wallet.</p><p style=\"font-size: 15px; color: rgb(34, 34, 34); line-height: 22px;\">Thanks.</p><p style=\"font-size: 14px; font-weight: bold; color: rgb(34, 34, 34);\">Security tips:</p><ol style=\"font-size: 14px; font-weight: bold; padding-left: 20px; color: rgb(54, 54, 54); line-height: 18px;\"><li>Never give your password to anyone</li><li>Never call any phone number for someone claiming to be Sterling Crest Ltd Support</li><li>Never send any money to anyone claiming to be a member of Sterling Crest Ltd team</li><li>Enable Google Two Factor Authentication.</li></ol><p style=\"font-size: 12px; color: rgb(34, 34, 34);\">If you don't recognize this activity, please contact our customer support immediately.</p><p style=\"font-size: 12px; color: rgb(34, 34, 34);\">Sterling Crest Ltd Team</p></div></div>";

		 mailSenderService.sendEmail(toAddress, subject, content);
		 mailSenderService.sendEmail(email, subject, content);

	}

	private void sendWithdrawalDeclined(Withdrawal withdrawal) throws UnsupportedEncodingException, MessagingException {
		String toAddress = withdrawal.getUser().getEmail();
		String subject = "Sterling Crest Ltd (Withdrawal Declined)";
		String content = "<div id=\"container\" style=\"box-shadow: 1px 1px 10px rgb(236, 236, 236); padding:12px; font-family: Arial, Helvetica, sans-serif;\"><div style=\"padding: 8px 16px; background-color: black; color: white; font-family: Arial, Helvetica, sans-serif;\"><p style=\"font-size: 20px; font-weight: bold;\">Sterling Crest Ltd</p></div><div style=\"padding: 12px; font-family: Arial, Helvetica, sans-serif; margin-top: 0px;\"><p style=\"font-weight: 600; font-size: 18px; color: rgba(0, 33, 124, 0.938);\">Transaction Declined</p><p style=\"color: rgba(0, 33, 124, 0.938); font-weight: 600;\">Dear "
				+ withdrawal.getUser().getFullName()
				+ ",</p><p style=\"font-size: 15px; color: rgb(34, 34, 34); line-height: 22px;\">Withdrawal request of <span style=\"font-weight: 600; color: rgba(0, 33, 124, 0.938);\">"
				+ withdrawal.getAmount()
				+ "USD</span> has been declined. Kindly log into your Sterling Crest Ltd account and reach out to our <span style=\"font-weight: 600; color: rgba(0, 33, 124, 0.938);\">Customer Support</span> for further assistance.</p><p style=\"font-size: 15px; color: rgb(34, 34, 34); line-height: 22px;\">Thanks.</p><p style=\"font-size: 14px; font-weight: bold; color: rgb(34, 34, 34);\">Security tips:</p><ol style=\"font-size: 14px; font-weight: bold; padding-left: 20px; color: rgb(54, 54, 54); line-height: 18px;\"><li>Never give your password to anyone</li><li>Never call any phone number for someone claiming to be Sterling Crest Ltd Support</li><li>Never send any money to anyone claiming to be a member of Sterling Crest Ltd team</li><li>Enable Google Two Factor Authentication.</li></ol><p style=\"font-size: 12px; color: rgb(34, 34, 34);\">If you don't recognize this activity, please contact our customer support immediately.</p><p style=\"font-size: 12px; color: rgb(34, 34, 34);\">Sterling Crest Ltd Team</p></div></div>";

		 mailSenderService.sendEmail(toAddress, subject, content);
		 mailSenderService.sendEmail(email, subject, content);

	}

}
