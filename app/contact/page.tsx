import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Lottery Intel",
  description: "Contact Lottery Intel about the Singapore lottery research platform, data questions, support or business enquiries.",
};

export default function ContactPage() {
  return (
    <main className="page-shell">
      <section className="section-shell narrow-shell">
        <p className="eyebrow">CONTACT</p>
        <h1>Contact Lottery Intel</h1>
        <p className="lead-copy">Questions about the platform, data, your account or a business enquiry? Contact us by email.</p>
        <div className="card">
          <h2>Email</h2>
          <p><a href="mailto:lotteryintel@gmail.com">lotteryintel@gmail.com</a></p>
          <p className="fine-print">Please do not send payment-card details or other sensitive financial information by email.</p>
        </div>
        <h2>Independent research platform</h2>
        <p>Lottery Intel is not Singapore Pools and cannot assist with ticket purchases, prize claims, outlet matters or Singapore Pools account enquiries.</p>
      </section>
    </main>
  );
}
