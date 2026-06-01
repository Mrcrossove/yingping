# Risk Fix Plan

## Scope

This plan addresses the security and consistency issues found in the code review:

1. Public registration must not allow privileged roles.
2. Role decorators must be enforced consistently.
3. Orders, payments, earnings, and withdrawals must enforce ownership and assignment checks.
4. Payment notification must require a server-side verification secret before mutating records.
5. Withdrawal and commission flows must avoid duplicate or over-broad mutations.

Environment-specific values such as JWT secrets, WeChat credentials, notification secrets, CORS origins, and server deployment paths are not hardcoded. They should be completed in `.env` before deployment.

## Implementation Checklist

- [x] Add this repair plan as the execution record.
- [x] Restrict public registration to merchant applications only.
- [x] Make role checks effective on order, withdrawal, promotion, and earning endpoints that rely on `@Roles`.
- [x] Add order ownership and assignment checks for detail, payment, maker, and delivery operations.
- [x] Replace mock payment mutation behavior with environment-gated logic and signed notification verification.
- [x] Make withdrawals use available-balance accounting that includes pending/approved/paid withdrawals.
- [x] Make commission creation idempotent for completed orders.
- [x] Run build/tests and document deployment commands.

## Required Environment Values

Add these to the production `.env` before going live:

```env
JWT_SECRET=
JWT_EXPIRES_IN=7d
PAYMENT_NOTIFY_SECRET=
WX_APPID=
WX_MCH_ID=
WX_API_V3_KEY=
WX_PRIVATE_KEY_PATH=
WX_SERIAL_NO=
WX_PAY_NOTIFY_URL=
CORS_ORIGINS=
ENABLE_SWAGGER=false
PORT=3000
```

`PAYMENT_NOTIFY_SECRET` is required by the current notification endpoint. The WeChat JSAPI prepay request now reads merchant parameters and the private key from `.env`; platform-certificate notification decryption can be added after the merchant certificate workflow is finalized.

## Deployment Notes

After code is pushed to GitHub `main`, deploy by pulling on the server at:

```text
ubuntu@VM-0-10-ubuntu:/opt/beverage-order
```
