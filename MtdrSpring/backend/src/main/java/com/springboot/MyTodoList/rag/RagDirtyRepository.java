package com.springboot.MyTodoList.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RagDirtyRepository extends JpaRepository<RagDirty, Long> {
    long countByAttemptsGreaterThanEqual(int attempts);
}
