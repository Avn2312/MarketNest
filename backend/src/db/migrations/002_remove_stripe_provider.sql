ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE payments
    ADD CONSTRAINT payments_provider_check
    CHECK (provider IN ('cod', 'razorpay'));

ALTER TABLE payment_events
    DROP CONSTRAINT IF EXISTS payment_events_provider_check;

ALTER TABLE payment_events
    ADD CONSTRAINT payment_events_provider_check
    CHECK (provider = 'razorpay');
