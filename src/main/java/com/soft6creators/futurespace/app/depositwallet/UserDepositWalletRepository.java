package com.soft6creators.futurespace.app.depositwallet;

import java.util.List;
import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserDepositWalletRepository extends CrudRepository<UserDepositWallet, Integer> {
    List<UserDepositWallet> findAllByUserEmail(String email);
    Optional<UserDepositWallet> findByUserEmailAndSymbol(String email, String symbol);
}
