package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.dto.AuthResponse;
import com.springboot.MyTodoList.dto.LoginRequest;
import com.springboot.MyTodoList.dto.RefreshRequest;
import com.springboot.MyTodoList.model.RefreshToken;
import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.repository.UserRepository;
import com.springboot.MyTodoList.security.JwtUtil;
import com.springboot.MyTodoList.service.RefreshTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByPhonenumber(request.getPhonenumber());

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(request.getPassword(), user.getUserPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        }

        String accessToken = jwtUtil.generateAccessToken(user.getPhoneNumber());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return ResponseEntity.ok(new AuthResponse(
                accessToken,
                refreshToken.getToken(),
                jwtUtil.getAccessExpiration()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshRequest request) {
        Optional<RefreshToken> tokenOpt = refreshTokenService.findByToken(request.getRefreshToken());

        if (tokenOpt.isEmpty() || refreshTokenService.isExpired(tokenOpt.get())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Refresh token expired or invalid"));
        }

        RefreshToken refreshToken = tokenOpt.get();
        String newAccessToken = jwtUtil.generateAccessToken(refreshToken.getUser().getPhoneNumber());

        return ResponseEntity.ok(new AuthResponse(
                newAccessToken,
                refreshToken.getToken(),
                jwtUtil.getAccessExpiration()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody RefreshRequest request) {
        refreshTokenService.findByToken(request.getRefreshToken())
                .ifPresent(rt -> refreshTokenService.deleteByUser(rt.getUser()));
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody LoginRequest request) {
        if (userRepository.findByPhonenumber(request.getPhonenumber()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "User already exists"));
        }

        User newUser = new User();
        newUser.setPhoneNumber(request.getPhonenumber());
        newUser.setUserPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(newUser);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "User registered successfully"));
    }
}
