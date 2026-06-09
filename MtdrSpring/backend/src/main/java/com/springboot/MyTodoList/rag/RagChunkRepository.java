package com.springboot.MyTodoList.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RagChunkRepository extends JpaRepository<RagChunk, Long> {

    Optional<RagChunk> findBySourceTypeAndSourceId(String sourceType, Long sourceId);

    boolean existsBySourceTypeAndSourceId(String sourceType, Long sourceId);

    long countBySourceType(String sourceType);
}
