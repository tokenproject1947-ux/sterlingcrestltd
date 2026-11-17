package com.soft6creators.futurespace.app.user;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.soft6creators.futurespace.app.accounttype.AccountType;
import com.soft6creators.futurespace.app.accounttype.AccountTypeRepository;
import com.soft6creators.futurespace.app.address.Address;
import com.soft6creators.futurespace.app.address.AddressRepository;
import com.soft6creators.futurespace.app.country.Country;
import com.soft6creators.futurespace.app.country.CountryRepository;
import com.soft6creators.futurespace.app.state.State;
import com.soft6creators.futurespace.app.state.StateRepository;

/**
 * Editing a member from the admin console.
 *
 * This applies only the fields actually sent rather than saving the posted
 * entity wholesale: the console form never carries the whole object, and a
 * plain save would silently blank every column it left out -- including the
 * account link.
 */
@RestController
public class AdminUserController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private AddressRepository addressRepository;
    @Autowired
    private CountryRepository countryRepository;
    @Autowired
    private StateRepository stateRepository;
    @Autowired
    private AccountTypeRepository accountTypeRepository;

    @CrossOrigin(maxAge = 3600)
    @RequestMapping(method = RequestMethod.PUT, value = "/admin/user/{email}")
    public Map<String, Object> updateMember(@PathVariable String email, @RequestBody AdminUserUpdate request) {
        Optional<User> found = userRepository.findByEmail(email);
        if (!found.isPresent()) {
            return result(false, "No member with that email", null);
        }

        User user = found.get();
        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            user.setFullName(request.getFullName().trim());
        }
        if (request.getMobileNumber() != null) {
            user.setMobileNumber(request.getMobileNumber().trim());
        }
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(request.getPassword());
        }
        if (request.getReferralId() != null) {
            user.setReferralId(request.getReferralId().trim());
        }
        if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
            user.setRole(request.getRole().trim().toUpperCase());
        }
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }
        userRepository.save(user);

        /* The profile row is filled in after sign-up, so a member may not have
           one yet. Create it rather than dropping the operator's edits. */
        Address address = addressRepository.findByUserEmail(email);
        if (address == null) {
            address = new Address();
            address.setUser(user);
        }
        if (request.getCountryId() != null) {
            Optional<Country> country = countryRepository.findById(request.getCountryId());
            if (country.isPresent()) address.setCountry(country.get());
        }
        if (request.getStateId() != null) {
            Optional<State> state = stateRepository.findById(request.getStateId());
            if (state.isPresent()) address.setState(state.get());
        }
        if (request.getAccountTypeId() != null) {
            Optional<AccountType> type = accountTypeRepository.findById(request.getAccountTypeId());
            if (type.isPresent()) address.setAccountType(type.get());
        }
        if (request.getCity() != null) address.setCity(request.getCity().trim());
        if (request.getAddressLine1() != null) address.setAddressLine1(request.getAddressLine1().trim());
        if (request.getAddressLine2() != null) address.setAddressLine2(request.getAddressLine2().trim());
        if (request.getZipCode() != null) address.setZipCode(request.getZipCode().trim());
        if (request.getDob() != null) address.setDob(request.getDob().trim());
        if (request.getSsn() != null) address.setSsn(request.getSsn().trim());
        if (request.getSource() != null) address.setSource(request.getSource().trim());
        if (request.getCitizen() != null) address.setCitizen(request.getCitizen());
        addressRepository.save(address);

        return result(true, "Saved", email);
    }

    private static Map<String, Object> result(boolean ok, String message, String email) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", ok);
        body.put("message", message);
        if (email != null) body.put("email", email);
        return body;
    }
}
