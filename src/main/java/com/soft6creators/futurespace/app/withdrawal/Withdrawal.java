package com.soft6creators.futurespace.app.withdrawal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.ManyToOne;
import javax.persistence.OneToOne;

import com.soft6creators.futurespace.app.crypto.Crypto;
import com.soft6creators.futurespace.app.user.User;

@Entity
public class Withdrawal {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private int withdrawalId;
	@ManyToOne
	private User user;
	private int amount;
	private String withdrawalStatus;
	@OneToOne
	private Crypto crypto;
	/**
	 * Payout rail chosen by the member: "Bitcoin", "PayPal" or "Bank". Separate
	 * from crypto so a fiat payout is not stamped with an asset it never
	 * touched. Null on rows written before this column existed.
	 */
	private String method;
	/**
	 * Where the payout is actually sent: a BTC address, a PayPal number, or the
	 * bank name / account name / account number / SWIFT joined with " / " for a
	 * wire. Named walletAddress because that is the key the withdraw page posts
	 * and the admin console echoes back on approve/decline -- without this
	 * column Jackson silently dropped the member's payout details on the floor.
	 * Null on rows written before this column existed.
	 */
	@Column(length = 512)
	private String walletAddress;
	private String date;
	public int getWithdrawalId() {
		return withdrawalId;
	}
	public void setWithdrawalId(int withdrawalId) {
		this.withdrawalId = withdrawalId;
	}
	public User getUser() {
		return user;
	}
	public void setUser(User user) {
		this.user = user;
	}
	public int getAmount() {
		return amount;
	}
	public void setAmount(int amount) {
		this.amount = amount;
	}
	public String getWithdrawalStatus() {
		return withdrawalStatus;
	}
	public void setWithdrawalStatus(String withdrawalStatus) {
		this.withdrawalStatus = withdrawalStatus;
	}
	public Crypto getCrypto() {
		return crypto;
	}
	public void setCrypto(Crypto crypto) {
		this.crypto = crypto;
	}
	public String getMethod() {
		return method;
	}
	public void setMethod(String method) {
		this.method = method;
	}
	public String getWalletAddress() {
		return walletAddress;
	}
	public void setWalletAddress(String walletAddress) {
		this.walletAddress = walletAddress;
	}
	
	public String getDate() {
		return date;
	}
	public void setDate(String date) {
		this.date = date;
	}
	
	
}
