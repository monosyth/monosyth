import styles from "@/app/shop/shop.module.css";

export function LockIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>;
}
export function CheckoutTrust({ children }: { children: React.ReactNode }) {
  return <section className={styles.checkoutPayment} aria-label="Secure payment">
    <div className={styles.paymentHeader}><span><LockIcon /> Secure payment</span><a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className={styles.stripeAttribution}>Powered by <strong>stripe</strong></a></div>
    <p className={styles.paymentIntro}>Enter your details below to complete your one-time purchase.</p>
    {children}
    <div className={styles.paymentSecurity}><LockIcon /><p>Your card details are encrypted and handled directly by Stripe. Monosyth never sees your full card number.</p></div>
    <div className={styles.paymentFooter}><span>Monosyth Labs, LLC</span><a href="mailto:scott@monosyth.com">Questions? Contact us ↗</a></div>
  </section>;
}
