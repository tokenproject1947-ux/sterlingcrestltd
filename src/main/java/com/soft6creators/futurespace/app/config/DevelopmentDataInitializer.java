package com.soft6creators.futurespace.app.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import net.bytebuddy.utility.RandomString;

import com.soft6creators.futurespace.app.account.Account;
import com.soft6creators.futurespace.app.account.AccountRepository;
import com.soft6creators.futurespace.app.accounttype.AccountType;
import com.soft6creators.futurespace.app.accounttype.AccountTypeRepository;
import com.soft6creators.futurespace.app.address.Address;
import com.soft6creators.futurespace.app.address.AddressRepository;
import com.soft6creators.futurespace.app.city.City;
import com.soft6creators.futurespace.app.city.CityRepository;
import com.soft6creators.futurespace.app.country.Country;
import com.soft6creators.futurespace.app.country.CountryRepository;
import com.soft6creators.futurespace.app.crypto.Crypto;
import com.soft6creators.futurespace.app.crypto.CryptoRepository;
import com.soft6creators.futurespace.app.investment.Investment;
import com.soft6creators.futurespace.app.investment.InvestmentRepository;
import com.soft6creators.futurespace.app.state.State;
import com.soft6creators.futurespace.app.state.StateRepository;
import com.soft6creators.futurespace.app.user.User;
import com.soft6creators.futurespace.app.user.UserRepository;
import com.soft6creators.futurespace.app.withdrawal.Withdrawal;
import com.soft6creators.futurespace.app.withdrawal.WithdrawalRepository;

/**
 * Small, idempotent reference-data seed used by the local application.
 * It only fills empty tables and never overwrites user-created data.
 */
@Component
public class DevelopmentDataInitializer implements CommandLineRunner {

    /** The default sign-in for the demo site; seeded on every fresh database. */
    private static final String DEFAULT_NAME = "Heather";
    private static final String DEFAULT_EMAIL = "test.investor.1794166040@example.test";
    private static final String DEFAULT_PASSWORD = "TestPass!123";
    private static final String DEFAULT_CITY = "Los Angeles";
    private static final String DEFAULT_MOBILE = "+15550101000";

    private final CountryRepository countryRepository;
    private final StateRepository stateRepository;
    private final CityRepository cityRepository;
    private final AccountTypeRepository accountTypeRepository;
    private final CryptoRepository cryptoRepository;
    private final UserRepository userRepository;
    private final WithdrawalRepository withdrawalRepository;
    private final InvestmentRepository investmentRepository;
    private final AccountRepository accountRepository;
    private final AddressRepository addressRepository;

    public DevelopmentDataInitializer(CountryRepository countryRepository,
            StateRepository stateRepository,
            CityRepository cityRepository,
            AccountTypeRepository accountTypeRepository,
            CryptoRepository cryptoRepository,
            UserRepository userRepository,
            WithdrawalRepository withdrawalRepository,
            InvestmentRepository investmentRepository,
            AccountRepository accountRepository,
            AddressRepository addressRepository) {
        this.countryRepository = countryRepository;
        this.stateRepository = stateRepository;
        this.cityRepository = cityRepository;
        this.accountTypeRepository = accountTypeRepository;
        this.cryptoRepository = cryptoRepository;
        this.userRepository = userRepository;
        this.withdrawalRepository = withdrawalRepository;
        this.investmentRepository = investmentRepository;
        this.accountRepository = accountRepository;
        this.addressRepository = addressRepository;
    }

    @Override
    public void run(String... args) {
        seedAccountTypes();
        seedCryptos();
        seedLocations();
        /* Before the demo history: those seeds look for a member to attach to. */
        seedDefaultUser();
        seedDemoWithdrawals();
        seedDemoDeposit();
    }

    /**
     * The default sign-in for the demo site. Seeded so a fresh database always
     * has a working credential and so the demo withdrawal/deposit history below
     * has a member to attach to. Creates the account, its profile row and its
     * wallet-less address in one go, and never overwrites anything that is
     * already there -- including the name, so renaming the account later sticks.
     */
    private void seedDefaultUser() {
        if (userRepository.findByEmail(DEFAULT_EMAIL).isPresent()) return;

        Account account = new Account();
        account.setAccountBalance(0);
        account.setInterestPreference(cryptoRepository.findById(1).orElse(null));
        account = accountRepository.save(account);

        User user = new User();
        user.setFullName(DEFAULT_NAME);
        user.setEmail(DEFAULT_EMAIL);
        user.setPassword(DEFAULT_PASSWORD);
        user.setMobileNumber(DEFAULT_MOBILE);
        /* Same convention UserService.addUser() uses for real sign-ups. */
        user.setReferralId(DEFAULT_NAME.trim() + "-" + RandomString.make(6));
        user.setDate(Instant.now().truncatedTo(ChronoUnit.MILLIS).toString());
        user.setActive(true);
        user.setAccountNonLocked(true);
        user.setAccountNonExpired(true);
        user.setCredentialNonExpired(true);
        user.setRole("USER");
        user.setAccount(account);
        userRepository.save(user);

        /* The dashboard reads these off the address row, and the admin console
           joins on it -- a member without one renders as blanks everywhere. */
        Address address = new Address();
        address.setUser(user);
        address.setCountry(countryRepository.findById(1).orElse(null));
        address.setState(findDemoState());
        address.setCity(DEFAULT_CITY);
        address.setMobileNumber(DEFAULT_MOBILE);
        address.setAccountType(accountTypeRepository.findById(1).orElse(null));
        addressRepository.save(address);
    }

    /**
     * California, falling back to whatever state the location seed produced
     * first so the profile is never left hanging off a null.
     */
    private State findDemoState() {
        State fallback = null;
        for (State state : stateRepository.findAll()) {
            if (fallback == null) fallback = state;
            if ("California".equals(state.getStateName())) return state;
        }
        return fallback;
    }

    /**
     * Gives local demo accounts a short withdrawal history so the dashboard's
     * Withdrawal History tab is populated on a fresh database. Only ever touches
     * *.example.test accounts, only fills accounts that have no withdrawals yet,
     * and writes straight to the repository so no balance is moved and no email
     * is sent.
     */
    private void seedDemoWithdrawals() {
        // method, cryptoId (null = fiat rail), amount, status, daysAgo
        String[][] rows = {
            {"Bitcoin", "1", "1250", "Successful", "26"},
            {"Bank",    null, "480", "Successful", "12"},
            {"PayPal",  null, "300", "Pending",     "3"}
        };

        for (User user : userRepository.findAll()) {
            if (user.getEmail() == null || !user.getEmail().endsWith("@example.test")) continue;
            if (withdrawalRepository.findAllByUserEmail(user.getEmail()).size() > 0) continue;

            for (String[] row : rows) {
                Withdrawal withdrawal = new Withdrawal();
                withdrawal.setUser(user);
                withdrawal.setMethod(row[0]);
                if (row[1] != null) {
                    withdrawal.setCrypto(cryptoRepository.findById(Integer.parseInt(row[1])).orElse(null));
                }
                withdrawal.setAmount(Integer.parseInt(row[2]));
                withdrawal.setWithdrawalStatus(row[3]);
                withdrawal.setDate(Instant.now().minus(Long.parseLong(row[4]), ChronoUnit.DAYS).truncatedTo(ChronoUnit.MILLIS).toString());
                withdrawalRepository.save(withdrawal);
            }
        }
    }

    /**
     * Gives local demo accounts a deposit so Transaction History shows both
     * sides of the ledger instead of withdrawals alone. This application has
     * no deposit table: a deposit is recorded by booking an Investment against
     * the account, so that is what gets written here -- straight to the
     * repository, because InvestmentService.addInvestment() re-derives the
     * balance from whatever the admin form last held.
     *
     * The balance is then set to deposit minus withdrawals, which is exactly
     * what the application's own flow would leave behind, so the ledger adds
     * up. Runs after seedDemoWithdrawals() for that reason, and skips any
     * account that already has an investment.
     */
    private void seedDemoDeposit() {
        final int deposit = 5000;
        final int planDays = 90;

        for (User user : userRepository.findAll()) {
            if (user.getEmail() == null || !user.getEmail().endsWith("@example.test")) continue;
            if (user.getAccount() == null) continue;
            if (investmentRepository.findByAccountAccountId(user.getAccount().getAccountId()).isPresent()) continue;

            int withdrawn = 0;
            for (Withdrawal withdrawal : withdrawalRepository.findAllByUserEmail(user.getEmail())) {
                withdrawn += withdrawal.getAmount();
            }

            /* Dated before the oldest demo withdrawal so the ledger reads in
               the order a member would expect. */
            Instant start = Instant.now().minus(37, ChronoUnit.DAYS).truncatedTo(ChronoUnit.MILLIS);

            Investment investment = new Investment();
            investment.setAccount(user.getAccount());
            investment.setInvestedAmount(deposit);
            investment.setDays(planDays);
            investment.setActive(true);
            investment.setInvestmentPlan("Growth");
            investment.setPercentage(15);
            investment.setStartDate(start.toString());
            investment.setEndDate(start.plus(planDays, ChronoUnit.DAYS).toString());
            investment.setCurrency(cryptoRepository.findById(1).orElse(null));
            investmentRepository.save(investment);

            user.getAccount().setAccountBalance(deposit - withdrawn);
            accountRepository.save(user.getAccount());
        }
    }

    private void seedAccountTypes() {
        if (accountTypeRepository.count() > 0) return;
        List<String> types = Arrays.asList("Starter", "Core", "Growth", "Private");
        for (int i = 0; i < types.size(); i++) {
            AccountType type = new AccountType();
            type.setAccountTypeId(i + 1);
            type.setAccountType(types.get(i));
            accountTypeRepository.save(type);
        }
    }

    private void seedCryptos() {
        if (cryptoRepository.count() > 0) return;
        String[][] assets = {
            {"Bitcoin", "BTC"}, {"Ethereum", "ETH"}, {"Tether", "USDT"},
            {"BNB", "BNB"}, {"Solana", "SOL"}, {"XRP", "XRP"},
            {"Litecoin", "LTC"}, {"Dogecoin", "DOGE"}
        };
        for (int i = 0; i < assets.length; i++) {
            Crypto crypto = new Crypto();
            crypto.setCryptoId(i + 1);
            crypto.setCrypto(assets[i][0]);
            crypto.setSymbol(assets[i][1]);
            cryptoRepository.save(crypto);
        }
    }

    private void seedLocations() {
        if (countryRepository.count() > 0) return;

        addLocation(1, "United States", new String[][] {
            {"California", "Los Angeles"}, {"New York", "New York"}, {"Texas", "Houston"}
        });
        addLocation(2, "United Kingdom", new String[][] {
            {"England", "London"}, {"Scotland", "Edinburgh"}, {"Wales", "Cardiff"}
        });
        addLocation(3, "Canada", new String[][] {
            {"Ontario", "Toronto"}, {"Quebec", "Montreal"}, {"British Columbia", "Vancouver"}
        });
        addLocation(4, "Nigeria", new String[][] {
            {"Lagos", "Lagos"}, {"Abuja", "Abuja"}, {"Rivers", "Port Harcourt"}
        });
        addLocation(5, "Ghana", new String[][] {
            {"Greater Accra", "Accra"}, {"Ashanti", "Kumasi"}, {"Western", "Takoradi"}
        });
    }

    private void addLocation(int id, String name, String[][] stateCities) {
        Country country = new Country();
        country.setCountryId(id);
        country.setCountryName(name);
        country = countryRepository.save(country);

        for (String[] stateCity : stateCities) {
            State state = new State();
            state.setStateName(stateCity[0]);
            state.setCountry(country);
            state = stateRepository.save(state);

            City city = new City();
            city.setCityName(stateCity[1]);
            city.setCountry(country);
            cityRepository.save(city);
        }
    }
}
