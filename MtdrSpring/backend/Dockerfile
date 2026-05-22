FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B && mv target/MyTodoList-*.jar target/app.jar

FROM openjdk:22-jdk
WORKDIR /app
EXPOSE 8080
COPY --from=builder /build/target/app.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
