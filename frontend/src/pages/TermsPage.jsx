import { Link } from 'react-router-dom';
import LegalLayout, { ContactOwner, List, Section } from '../components/LegalLayout';

const linkStyle = { color: '#1f4d3a', fontWeight: 600 };

export default function TermsPage() {
    return (
        <LegalLayout
            title="Terms of Service"
            updated="October 8, 2026"
            intro="These terms explain how the TataMawing Solar website works and what you can expect from us. By creating an account or sending a request, you agree to them."
        >
            <Section title="Where we work">
                <p>We currently install solar systems in Bulan, Sorsogon only.</p>
            </Section>

            <Section title="The solar calculator gives estimates">
                <List>
                    <li>
                        The recommended system, price, estimated savings, and return figures are estimates based on
                        what you enter and on typical values — for example ₱12 per kWh when you don’t give your kWh,
                        and an average of 4.5 hours of strong sun a day.
                    </li>
                    <li>
                        Your real savings depend on your actual electricity use, the weather, your roof, and your
                        electricity rates. They are a guide, not a guarantee.
                    </li>
                </List>
            </Section>

            <Section title="Quotations">
                <List>
                    <li>A quotation is final only after we review and approve it.</li>
                    <li>
                        A site visit may show that your house needs a different system or extra work. If the price
                        changes because of this, or because supplier prices change, we’ll tell you before going ahead.
                    </li>
                </List>
            </Section>

            <Section title="Site visits and installation dates">
                <List>
                    <li>A date you choose is a request until we confirm it.</li>
                    <li>We may need to move a date because of weather or availability; we’ll let you know.</li>
                </List>
            </Section>

            <Section title="Installation requests with another company’s quotation">
                <List>
                    <li>Only upload a quotation you received yourself and are allowed to share.</li>
                    <li>We review each request and may decline it; we’ll tell you why.</li>
                </List>
            </Section>

            <Section title="Your account">
                <List>
                    <li>Give correct details so we can reach you and plan the installation.</li>
                    <li>Keep your password to yourself. You’re responsible for what is done with your account.</li>
                    <li>Be respectful in chat. Don’t send passwords or bank details through chat.</li>
                </List>
            </Section>

            <Section title="Messenger">
                <p>
                    If we don’t reply in chat for a while, we may offer a link to message us on Facebook Messenger.
                    Using it is optional, and Meta’s terms and privacy policy apply there.
                </p>
            </Section>

            <Section title="Your information">
                <p>
                    How we collect, use, and protect your personal information is explained in our{' '}
                    <Link to="/privacy" style={linkStyle}>Privacy Policy</Link>.
                </p>
            </Section>

            <Section title="Changes and questions">
                <p>
                    If these terms change, we’ll update this page and the date at the top. For questions, contact
                    the business owner:
                </p>
                <ContactOwner />
            </Section>
        </LegalLayout>
    );
}
