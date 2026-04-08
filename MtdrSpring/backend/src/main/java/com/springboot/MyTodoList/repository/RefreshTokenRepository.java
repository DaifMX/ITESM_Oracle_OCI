package com.springboot.MyTodoList.repository;

import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);

    /**
     * JPQL bulk delete with immediate flush so the DELETE is committed to the DB
     * before the subsequent INSERT, preventing ORA-00001 on the EMPLOYEE_ID unique constraint.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM RefreshToken rt WHERE rt.employee = :employee")
    void deleteByEmployee(@Param("employee") Employee employee);
}
