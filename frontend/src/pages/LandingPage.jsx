import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import EngineHeader from './quote-builder/EngineHeader';
import EngineLanding from './quote-builder/EngineLanding';
import QuotationFormPage from './QuotationFormPage';
import { s } from './quote-builder/engineStyles';
import './quote-builder/engine.css';

// Home page (route: /)
// The Solar Computation Engine landing, with the calculator itself right
// below the hero. "Get Started" scrolls down to it. Every visit starts the
// calculator empty (QuotationFormPage starts a new session on its own).
// /quotation/new still opens the calculator on its own page — logged-in
// customers use it from their sidebar, and guests come back to it after
// logging in.
export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const start = () => {
        document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const setInstallation = () => {
        navigate('/external-installation-request');
    };

    return (
        <div className="se-root" style={s.page}>
            <EngineHeader
                screen="landing"
                user={user}
                onLogoClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                onGetStarted={start}
            />
            <EngineLanding onStart={start} onSetInstallation={setInstallation} />
            <QuotationFormPage embedded />
        </div>
    );
}
