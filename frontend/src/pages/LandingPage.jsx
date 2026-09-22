import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import EngineHeader from './quote-builder/EngineHeader';
import EngineLanding from './quote-builder/EngineLanding';
import { s } from './quote-builder/engineStyles';
import './quote-builder/engine.css';

// Home page (route: /)
// Shows the Solar Computation Engine landing. "Get Started" opens the engine
// at /quotation/new: guests get the full-width steps, logged-in customers get
// the steps inside their sidebar layout.
export default function LandingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const start = () => navigate('/quotation/new');
    const setInstallation = () => {
        navigate('/external-installation-request');
    };

    return (
        <div className="se-root" style={s.page}>
            <EngineHeader
                screen="landing"
                user={user}
                onLogoClick={() => window.scrollTo(0, 0)}
                onGetStarted={start}
            />
            <EngineLanding onStart={start} onSetInstallation={setInstallation} />
        </div>
    );
}
