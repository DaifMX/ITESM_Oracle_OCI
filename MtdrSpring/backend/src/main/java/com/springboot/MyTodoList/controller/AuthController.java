package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.dto.AuthResponse;
import com.springboot.MyTodoList.dto.LoginRequest;
import com.springboot.MyTodoList.dto.RefreshRequest;
import com.springboot.MyTodoList.dto.RegisterRequest;
import com.springboot.MyTodoList.model.Employee;
import com.springboot.MyTodoList.model.RefreshToken;
import com.springboot.MyTodoList.repository.EmployeeRepository;
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
    private EmployeeRepository employeeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<Employee> employeeOpt = employeeRepository.findByEmail(request.getEmail());

        if (employeeOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        }

        Employee employee = employeeOpt.get();

        if (!passwordEncoder.matches(request.getPassword(), employee.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        }

        String accessToken = jwtUtil.generateAccessToken(employee.getEmail());
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(employee);

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
        String newAccessToken = jwtUtil.generateAccessToken(refreshToken.getEmployee().getEmail());

        return ResponseEntity.ok(new AuthResponse(
                newAccessToken,
                refreshToken.getToken(),
                jwtUtil.getAccessExpiration()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody RefreshRequest request) {
        refreshTokenService.findByToken(request.getRefreshToken())
                .ifPresent(rt -> refreshTokenService.deleteByEmployee(rt.getEmployee()));
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (employeeRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Employee already exists"));
        }

        Employee newEmployee = new Employee();
        newEmployee.setEmail(request.getEmail());
        newEmployee.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        newEmployee.setFirstName(request.getFirstName());
        newEmployee.setLastName(request.getLastName());
        newEmployee.setModality(request.getModality());
        newEmployee.setPosition(request.getPosition());
        newEmployee.setRole(request.getRole());
        newEmployee.setPhoneNumber(request.getPhoneNumber());
        newEmployee.setTelegramChatId(request.getTelegramChatId());
        employeeRepository.save(newEmployee);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", "Employee registered successfully"));
    }
}
