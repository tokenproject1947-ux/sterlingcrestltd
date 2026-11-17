package com.soft6creators.futurespace.app.depositwallet;

import java.util.List;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DepositWalletRepository extends CrudRepository<DepositWallet, Integer> {
    List<DepositWallet> findAllByOrderBySortOrderAscWalletIdAsc();
}
