package com.soft6creators.futurespace.app.investment;

import java.util.List;
import java.util.Optional;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvestmentRepository extends CrudRepository<Investment, Integer> {
	public Optional<Investment> findByAccountAccountId(int accountId);
	public List<Investment> findAllByAccountAccountId(int accountId);
}
