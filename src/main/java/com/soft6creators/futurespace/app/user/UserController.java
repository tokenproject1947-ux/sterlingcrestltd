package com.soft6creators.futurespace.app.user;

import java.security.Principal;
import java.util.Optional;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import com.soft6creators.futurespace.app.security.AuthSession;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.soft6creators.futurespace.app.address.Address;
import com.soft6creators.futurespace.app.address.AddressService;

@RestController
public class UserController {
	@Autowired
	private UserService userService;
	@Autowired
	private AddressService addressService;
	

	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.POST, value = "/user")
	public User addUser(@RequestBody User user, HttpServletRequest request) {
		User created = userService.addUser(user);
		/* The onboarding steps run before any sign-in, so the account has to be
		   signed in as it is created or the guard would turn them away. */
		if (created != null && created.getEmail() != null) {
			AuthSession.establish(request.getSession(true), created.getEmail(), created.getRole());
		}
		return created;
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/user/email/{email}")
	public User getUser(@PathVariable String email) {
		Address address = addressService.getAddressByEmail(email);
		if (address != null) {
			return address.getUser();
		}
		/* No profile row yet, which is normal: the address step is only filled
		   in after sign-up. Nothing to lock, and no reason to blow up with
		   NoSuchElementException for a member who simply has not got there. */
		Optional<User> user = userService.getUser(email);
		if (!user.isPresent()) {
			return null;
		}
		user.get().setAccountNonLocked(false);
		return user.get();
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/signin")
	public User signIn(@RequestBody User request, HttpServletRequest httpRequest) {
		User signedIn = userService.signIn(request.getEmail(), request.getPassword());
		if (signedIn != null && signedIn.getEmail() != null) {
			AuthSession.establish(httpRequest.getSession(true), signedIn.getEmail(), signedIn.getRole());
		}
		return signedIn;
	}
	
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/admin")
	public String getAdmin(Principal principal) {
		return principal.getName();
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/verify/{verificationCode}")
	private boolean verify(@PathVariable String verificationCode) {
		return userService.verify(verificationCode);
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.POST, value = "/forgot-password")
	public boolean forgotPassword(@RequestBody User request) {
		return userService.forgotPassword(request.getEmail());
	}

	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.PUT, value = "/reset-password")
	public boolean resetPassword(@RequestBody User request) {
		return userService.resetPassword(request.getEmail(), request.getPassword());
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping("/user/{email}/resend")
	public boolean resend(@PathVariable String email) {
		return userService.resend(email);
	}
	
	@CrossOrigin(maxAge = 3600)
	@RequestMapping(method = RequestMethod.PUT, value = "/user")
	private User updateUser(@RequestBody User user) {
		return userService.updateUser(user);
	}
	
	@RequestMapping(method = RequestMethod.POST, value = "/users")
	private List<Address> addUsers(@RequestBody List<Address> addresses) {
		return userService.addUsers(addresses);
	}

}
