package com.springboot.MyTodoList.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "REFRESH_TOKENS")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "USER_ID", referencedColumnName = "ID")
    private User user;

    @Column(name = "TOKEN", nullable = false, unique = true)
    private String token;

    @Column(name = "EXPIRY_DATE", nullable = false)
    private Instant expiryDate;

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Instant getExpiryDate() { return expiryDate; }
    public void setExpiryDate(Instant expiryDate) { this.expiryDate = expiryDate; }
}
