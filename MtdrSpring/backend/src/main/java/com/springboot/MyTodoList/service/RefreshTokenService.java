package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.RefreshToken;
import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    public RefreshToken createRefreshToken(User user) {
        // Delete any existing refresh token for this user
        refreshTokenRepository.findAll().stream()
                .filter(rt -> rt.getUser().getID() == user.getID())
                .forEach(rt -> refreshTokenRepository.delete(rt));

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshExpiration));
        return refreshTokenRepository.save(refreshToken);
    }

    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    public boolean isExpired(RefreshToken token) {
        return token.getExpiryDate().isBefore(Instant.now());
    }

    @Transactional
    public void deleteByUser(User user) {
        refreshTokenRepository.deleteByUser(user);
    }
}
