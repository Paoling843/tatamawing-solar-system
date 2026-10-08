import { Link } from 'react-router-dom';
import LegalLayout, { ContactOwner, List, Section } from '../components/LegalLayout';

// Written from what the system actually stores — if a feature starts
// collecting something new, update this page too.
export default function PrivacyPolicyPage() {
    return (
        <LegalLayout
            title="Privacy Policy"
            updated="October 8, 2026"
            intro="This explains what personal information TataMawing Solar collects through this website, why we need it, who can see it, and what you can ask us to do with it. We follow the Data Privacy Act of 2012 (Republic Act No. 10173)."
        >
            <Section title="Who is responsible for your information">
                <p>
                    TataMawing Solar, a solar installation business in Bulan, Sorsogon. The business owner is
                    responsible for your personal information and is also the person who manages this system. To ask
                    about your data, contact the owner (see “How to contact us” below).
                </p>
            </Section>

            <Section title="What we collect">
                <List>
                    <li>
                        <strong>Your account:</strong> name, email address, mobile number, and (if you give them) your
                        home address and installation location. Your password is stored scrambled (hashed), so no one —
                        not even the owner — can read it.
                    </li>
                    <li>
                        <strong>Quotation requests:</strong> where the system will be installed (barangay and purok),
                        your description of the house or site, your appliances and when you use them, and the
                        electricity bill amounts and kWh you enter.
                    </li>
                    <li>
                        <strong>Installation schedules:</strong> the dates and notes for your site visit and
                        installation.
                    </li>
                    <li>
                        <strong>Installation requests without an account:</strong> name, email, mobile number,
                        installation location, site description, preferred date, the other solar company’s name, and
                        the quotation file you upload.
                    </li>
                    <li>
                        <strong>Chat messages</strong> you send us through “Chat with us”.
                    </li>
                    <li>
                        <strong>Calculator use:</strong> when you use the solar calculator, we keep a random ID for
                        that visit, how far you got, and whether you asked for a quotation. Your inputs are not
                        sent until you submit a request. If you then sign in and submit, the visit is linked to your
                        request.
                    </li>
                    <li>
                        <strong>Activity records:</strong> when you sign in and do certain things (for example,
                        submit a quotation request), we record what was done, when, and your device’s IP address and
                        browser, to keep the system secure.
                    </li>
                </List>
            </Section>

            <Section title="Why we use it">
                <List>
                    <li>To prepare your quotation, estimated savings, and recommended system.</li>
                    <li>To plan and carry out site visits and installations.</li>
                    <li>To reply to your messages and email you about your requests.</li>
                    <li>To see how the calculator is used so we can improve it (counted without names).</li>
                    <li>To keep the system secure and find out what happened if something goes wrong.</li>
                </List>
                <p>We don’t use your information for advertising, and we don’t sell it.</p>
            </Section>

            <Section title="Who can see it">
                <List>
                    <li>The business owner, who manages the system.</li>
                    <li>
                        An email delivery service, only to send you emails about your account and requests.
                    </li>
                    <li>
                        Meta (Facebook), only if you choose to message us on Messenger. Meta’s own privacy policy
                        applies to anything you send there.
                    </li>
                    <li>
                        Suppliers receive only the list of materials needed — not your name, contact details, or
                        address.
                    </li>
                    <li>Government authorities, only if the law requires it.</li>
                </List>
            </Section>

            <Section title="What your browser stores">
                <p>
                    This website doesn’t use advertising or third-party tracking cookies. Your browser keeps only what
                    the site needs to work: your sign-in (until you log out or close the browser, unless you chose
                    “Keep me signed in on this device”), your calculator inputs while you sign in to request a quotation, and chat
                    cards you closed with “I’ll wait”.
                </p>
            </Section>

            <Section title="How long we keep it">
                <p>
                    We keep your information until you ask us to delete it. When you ask, we delete your account,
                    requests, messages, and uploaded files, and let you know when it’s done. We keep something longer
                    only if the law requires us to.
                </p>
            </Section>

            <Section title="How we protect it">
                <List>
                    <li>Only the owner’s admin account can see customer requests, messages, and uploaded files.</li>
                    <li>Passwords are hashed, and uploaded quotation files are stored privately, not on a public link.</li>
                    <li>Each customer can see only their own quotations, schedules, and messages.</li>
                </List>
            </Section>

            <Section title="Your rights">
                <p>Under the Data Privacy Act, you have the right to:</p>
                <List>
                    <li>be told how your information is used (this page);</li>
                    <li>see the information we have about you, and get a copy of it;</li>
                    <li>have wrong or incomplete information corrected;</li>
                    <li>object to how we use it, or have it deleted or blocked;</li>
                    <li>be compensated if you are harmed by misuse of your information; and</li>
                    <li>
                        file a complaint with the National Privacy Commission (
                        <a href="https://privacy.gov.ph" target="_blank" rel="noopener noreferrer" style={{ color: '#1f4d3a', fontWeight: 600 }}>
                            privacy.gov.ph
                        </a>
                        ).
                    </li>
                </List>
            </Section>

            <Section title="How to contact us">
                <p>For any of the above, contact the business owner:</p>
                <ContactOwner />
            </Section>

            <Section title="Changes to this policy">
                <p>
                    If we change how we use your information, we’ll update this page and the date at the top. See
                    also our <Link to="/terms" style={{ color: '#1f4d3a', fontWeight: 600 }}>Terms of Service</Link>.
                </p>
            </Section>
        </LegalLayout>
    );
}
