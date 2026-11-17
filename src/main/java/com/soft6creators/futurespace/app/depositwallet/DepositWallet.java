package com.soft6creators.futurespace.app.depositwallet;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

/**
 * One of the platform's own deposit addresses, the kind of thing an operator
 * maintains in the admin console: a currency label, the address members send
 * funds to, and optionally a QR code image for it.
 *
 * The QR is deliberately optional and never derived from the address. An
 * operator adds one when they have artwork for it; a wallet without one simply
 * shows the text address and a copy button. Generating a QR automatically
 * would risk showing a code that disagrees with whatever is in the address
 * field, which is how deposits get misdirected.
 */
@Entity
public class DepositWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int walletId;

    /** Ticker-ish key used to match a member's override, e.g. "BTC". */
    @Column(length = 32)
    private String symbol;

    /** Currency name shown to members, e.g. "Bitcoin". */
    @Column(length = 64)
    private String label;

    /** Network or token standard, e.g. "TRC20". Free text, shown small. */
    @Column(length = 64)
    private String network;

    @Column(length = 512)
    private String address;

    /** Public path of the uploaded QR image, or null when none was added. */
    @Column(length = 512)
    private String qrPath;

    private boolean isActive;

    private int sortOrder;

    public int getWalletId() {
        return walletId;
    }

    public void setWalletId(int walletId) {
        this.walletId = walletId;
    }

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getNetwork() {
        return network;
    }

    public void setNetwork(String network) {
        this.network = network;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getQrPath() {
        return qrPath;
    }

    public void setQrPath(String qrPath) {
        this.qrPath = qrPath;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean isActive) {
        this.isActive = isActive;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
