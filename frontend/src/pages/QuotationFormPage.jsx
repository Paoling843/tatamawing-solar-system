import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../components/CustomerLayout';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import {
    PlusIcon, SunIcon, UserIcon, PhoneIcon, MailIcon, LocationIcon,
    PlugIcon, BoltIcon, ClockIcon, BuildingIcon, SendIcon,
} from '../components/Icons';


export default function QuotationFormPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [solarSystemType, setSolarSystemType] = useState('on-grid');

    const [monthlyBill] = useState('');

    const [appliances, setAppliances] = useState(() => [
        { id: Date.now(), appliance_name: '', wattage: '', quantity: 1, usage_hours_per_day: '' }
    ]);

    const [installationLocation, setInstallationLocation] = useState({
        barangay: '',
        street: '',
        buildingNumber: '',
    });

    const [error, setError] = useState('');

    const [loading, setLoading] = useState(false);

    const addAppliance = () => {
        setAppliances([
            ...appliances,
            { id: Date.now(), appliance_name: '', wattage: '', quantity: 1, usage_hours_per_day: '' }
        ]);
    };

    const handleApplianceChange = (id, field, value) => {
        setAppliances(appliances.map(a =>
            a.id === id ? { ...a, [field]: value } : a
        ));
    };

    const handleLocationChange = (field, value) => {
        setInstallationLocation({ ...installationLocation, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/quotation-requests', {
                solar_system_type: solarSystemType,
                monthly_bill: monthlyBill ? parseFloat(monthlyBill) : null,
                appliances: appliances.map(({ id, ...rest }) => ({
                    ...rest,
                    wattage: parseInt(rest.wattage) || 0,
                    quantity: parseInt(rest.quantity) || 1,
                    usage_hours_per_day: parseFloat(rest.usage_hours_per_day) || 0,
                })),
            });

            navigate('/quotation/result', {
                state: {
                    quotationRequest: res.data.quotation_request,
                    computation: res.data.computation,
                }
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to compute quotation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <CustomerLayout active="Request Quotation">

            <div className="hero-banner" style={styles.hero}>
                <div style={styles.heroLeft}>
                    <div style={styles.heroBadge}>
                        <div style={styles.heroBadgeIcon}>
                            <SunIcon size={13} color="white" />
                        </div>
                        <span>Request a Quotation</span>
                    </div>
                    <h1 style={styles.heroTitle}>Let's Build a Cleaner, Brighter Future</h1>
                    <p style={styles.heroSubtitle}>
                        Fill out the form below to get a customized solar solution for your home or business.
                    </p>
                </div>

            </div>

            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="responsive-grid-2" style={styles.formGrid}>

                    <div style={styles.panel}>
                        <div style={styles.panelHeader}>
                            <div style={styles.panelIconCircle}>
                                <UserIcon size={18} color="#1a4a3a" />
                            </div>
                            <div>
                                <h2 style={styles.panelTitle}>Customer Information</h2>
                                <p style={styles.panelDesc}>
                                    Please provide your contact details so we can get in touch with you.
                                </p>
                            </div>
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>
                                <UserIcon size={14} color="#6b7280" />
                                <span>Full Name</span>
                                <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={user?.name || ''}
                                readOnly
                                style={{ ...styles.input, backgroundColor: '#f9fafb' }}
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>
                                <PhoneIcon size={14} color="#6b7280" />
                                <span>Contact Number</span>
                                <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="09XXXXXXXXX"
                                style={styles.input}
                                required
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>
                                <MailIcon size={14} color="#6b7280" />
                                <span>Email</span>
                                <span style={styles.required}>*</span>
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                style={{ ...styles.input, backgroundColor: '#f9fafb' }}
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>
                                <LocationIcon size={14} color="#6b7280" />
                                <span>Address</span>
                                <span style={styles.required}>*</span>
                            </label>
                            <textarea
                                placeholder="Your address"
                                style={{ ...styles.input, height: '90px', resize: 'vertical' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.rightColumn}>

                        <div style={styles.panel}>
                            <div style={styles.panelHeader}>
                                <div style={styles.panelIconCircle}>
                                    <BoltIcon size={18} color="#1a4a3a" />
                                </div>
                                <div>
                                    <h2 style={styles.panelTitle}>Appliance and Power Usage</h2>
                                    <p style={styles.panelDesc}>
                                        Tell us about the appliances you'll be using and your daily consumption.
                                    </p>
                                </div>
                            </div>

                            <div style={styles.applianceHeader}>
                                <span style={{ ...styles.applianceHeaderItem, flex: 3 }}>
                                    <PlugIcon size={13} color="#9ca3af" />
                                    <span>Appliance</span>
                                </span>
                                <span style={{ ...styles.applianceHeaderItem, flex: 1.5 }}>
                                    <span style={styles.hashIcon}>#</span>
                                    <span>Quantity</span>
                                    <span style={styles.required}>*</span>
                                </span>
                                <span style={{ ...styles.applianceHeaderItem, flex: 1.5 }}>
                                    <BoltIcon size={13} color="#9ca3af" />
                                    <span>Watts</span>
                                    <span style={styles.required}>*</span>
                                </span>
                                <span style={{ ...styles.applianceHeaderItem, flex: 1.5 }}>
                                    <ClockIcon size={13} color="#9ca3af" />
                                    <span>Hours/Day</span>
                                    <span style={styles.required}>*</span>
                                </span>
                            </div>

                            {appliances.map((appliance) => (
                                <div key={appliance.id} style={styles.applianceRow}>
                                    <input
                                        type="text"
                                        value={appliance.appliance_name}
                                        onChange={(e) => handleApplianceChange(
                                            appliance.id, 'appliance_name', e.target.value
                                        )}
                                        style={{ ...styles.applianceInput, flex: 3 }}
                                        placeholder="e.g. LED Bulb"
                                        required
                                    />

                                    <input
                                        type="number"
                                        min="1"
                                        value={appliance.quantity}
                                        onChange={(e) => handleApplianceChange(
                                            appliance.id, 'quantity', e.target.value
                                        )}
                                        style={{ ...styles.applianceInput, flex: 1.5 }}
                                        required
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        value={appliance.wattage}
                                        onChange={(e) => handleApplianceChange(
                                            appliance.id, 'wattage', e.target.value
                                        )}
                                        style={{ ...styles.applianceInput, flex: 1.5 }}
                                        placeholder="W"
                                        required
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        max="24"
                                        value={appliance.usage_hours_per_day}
                                        onChange={(e) => handleApplianceChange(
                                            appliance.id, 'usage_hours_per_day', e.target.value
                                        )}
                                        style={{ ...styles.applianceInput, flex: 1.5 }}
                                        placeholder="h"
                                        required
                                    />
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addAppliance}
                                className="btn-primary"
                                style={styles.addApplianceBtn}
                            >
                                <PlusIcon size={14} color="white" />
                                <span>Add Appliance</span>
                            </button>
                        </div>

                        <div style={styles.panel}>
                            <div style={styles.panelHeader}>
                                <div style={styles.panelIconCircle}>
                                    <SunIcon size={18} color="#1a4a3a" />
                                </div>
                                <div>
                                    <h2 style={styles.panelTitle}>Solar Type</h2>
                                    <p style={styles.panelDesc}>
                                        What type of solar system are you interested in?
                                    </p>
                                </div>
                            </div>

                            <div style={styles.radioGroup}>

                                <label style={styles.radioLabel}>
                                    <div style={styles.radioInputWrapper}>
                                        <input
                                            type="radio"
                                            name="solar_type"
                                            value="on-grid"
                                            checked={solarSystemType === 'on-grid'}
                                            onChange={() => setSolarSystemType('on-grid')}
                                            style={styles.radioInput}
                                        />
                                        <div style={{
                                            ...styles.radioCircle,
                                            borderColor: solarSystemType === 'on-grid' ? '#1a4a3a' : '#d1d5db',
                                            backgroundColor: solarSystemType === 'on-grid' ? '#1a4a3a' : 'transparent',
                                        }}>
                                            {solarSystemType === 'on-grid' && (
                                                <div style={styles.radioInner} />
                                            )}
                                        </div>
                                    </div>
                                    <span style={styles.radioText}>On Grid</span>
                                </label>

                                <label style={styles.radioLabel}>
                                    <div style={styles.radioInputWrapper}>
                                        <input
                                            type="radio"
                                            name="solar_type"
                                            value="off-grid"
                                            checked={solarSystemType === 'off-grid'}
                                            onChange={() => setSolarSystemType('off-grid')}
                                            style={styles.radioInput}
                                        />
                                        <div style={{
                                            ...styles.radioCircle,
                                            borderColor: solarSystemType === 'off-grid' ? '#1a4a3a' : '#d1d5db',
                                            backgroundColor: solarSystemType === 'off-grid' ? '#1a4a3a' : 'transparent',
                                        }}>
                                            {solarSystemType === 'off-grid' && (
                                                <div style={styles.radioInner} />
                                            )}
                                        </div>
                                    </div>
                                    <span style={styles.radioText}>Off Grid</span>
                                </label>

                                <label style={styles.radioLabel}>
                                    <div style={styles.radioInputWrapper}>
                                        <input
                                            type="radio"
                                            name="solar_type"
                                            value="hybrid"
                                            checked={solarSystemType === 'hybrid'}
                                            onChange={() => setSolarSystemType('hybrid')}
                                            style={styles.radioInput}
                                        />
                                        <div style={{
                                            ...styles.radioCircle,
                                            borderColor: solarSystemType === 'hybrid' ? '#1a4a3a' : '#d1d5db',
                                            backgroundColor: solarSystemType === 'hybrid' ? '#1a4a3a' : 'transparent',
                                        }}>
                                            {solarSystemType === 'hybrid' && (
                                                <div style={styles.radioInner} />
                                            )}
                                        </div>
                                    </div>
                                    <span style={styles.radioText}>Hybrid</span>
                                </label>
                            </div>
                        </div>

                        <div style={styles.panel}>
                            <div style={styles.panelHeader}>
                                <div style={styles.panelIconCircle}>
                                    <LocationIcon size={18} color="#1a4a3a" />
                                </div>
                                <div>
                                    <h2 style={styles.panelTitle}>Installation Location</h2>
                                    <p style={styles.panelDesc}>
                                        Where do you want the system to be installed?
                                    </p>
                                </div>
                            </div>

                            <div className="location-row" style={styles.locationRow}>
                                <div style={{ ...styles.field, flex: 1, marginBottom: 0 }}>
                                    <label style={styles.label}>
                                        <LocationIcon size={14} color="#6b7280" />
                                        <span>Brgy.</span>
                                        <span style={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={installationLocation.barangay}
                                        onChange={(e) => handleLocationChange('barangay', e.target.value)}
                                        style={styles.input}
                                        placeholder="Barangay"
                                        required
                                    />
                                </div>

                                <div style={{ ...styles.field, flex: 1, marginBottom: 0 }}>
                                    <label style={styles.label}>
                                        <span>Street</span>
                                        <span style={styles.required}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={installationLocation.street}
                                        onChange={(e) => handleLocationChange('street', e.target.value)}
                                        style={styles.input}
                                        placeholder="Street name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="location-row" style={{ ...styles.locationRow, alignItems: 'flex-end' }}>
                                <div style={{ ...styles.field, flex: 1, marginBottom: 0 }}>
                                    <label style={styles.label}>
                                        <BuildingIcon size={14} color="#6b7280" />
                                        <span>Building Number</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={installationLocation.buildingNumber}
                                        onChange={(e) => handleLocationChange('buildingNumber', e.target.value)}
                                        style={styles.input}
                                        placeholder="Building / House number"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{
                                        ...styles.submitBtn,
                                        opacity: loading ? 0.7 : 1,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                    }}
                                    disabled={loading}
                                >
                                    <SendIcon size={15} color="white" />
                                    <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <Footer />
        </CustomerLayout>
    );
}

// Shared page footer — declared at module scope so React sees the same
// component type on every render
function Footer() {
    return (
        <div style={styles.footer}>
            <div style={styles.footerLeft}>
                <span style={styles.footerText}>© 2024 TataMawing Solar. All rights reserved.</span>
                <div style={styles.footerLinks}>
                    <span style={styles.footerLink}>Privacy Policy</span>
                    <span style={styles.footerLink}>Terms of Service</span>
                    <span style={styles.footerLink}>Sustainability Report</span>
                </div>
            </div>
        </div>
    );
}

const styles = {
    error: {
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        padding: '0.75rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.875rem',
    },
    hero: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '1.5rem',
        background: 'linear-gradient(90deg, #eaf6f0 0%, #eaf6f0 30%, #1a4a3a 100%)',
    },
    heroLeft: {
        flex: 1,
        minWidth: 0,
        padding: '2rem 0 2rem 2rem',
    },
    heroBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.7rem',
        fontWeight: '700',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#1a4a3a',
        marginBottom: '0.75rem',
    },
    heroBadgeIcon: {
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        backgroundColor: '#1a4a3a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    heroTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.5rem 0',
        lineHeight: 1.25,
    },
    heroSubtitle: {
        fontSize: '0.875rem',
        color: '#374151',
        maxWidth: '420px',
        margin: 0,
        lineHeight: 1.5,
    },
    formGrid: {
        marginBottom: '1.5rem',
        alignItems: 'start',
    },
    rightColumn: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    panel: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid #f3f4f6',
    },
    panelHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        marginBottom: '1.25rem',
    },
    panelIconCircle: {
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        backgroundColor: '#f0f7f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    panelTitle: {
        fontSize: '0.95rem',
        fontWeight: '700',
        color: '#111827',
        margin: '0 0 0.2rem 0',
    },
    panelDesc: {
        fontSize: '0.8rem',
        color: '#9ca3af',
        margin: 0,
    },
    required: {
        color: '#dc2626',
    },
    field: {
        marginBottom: '1rem',
    },
    label: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.875rem',
        color: '#374151',
        marginBottom: '0.375rem',
    },
    input: {
        width: '100%',
        padding: '0.625rem 0.75rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#374151',
        backgroundColor: '#f9fafb',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
    },
    applianceHeader: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        fontSize: '0.75rem',
        color: '#374151',
        fontWeight: '500',
    },
    applianceHeaderItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
    },
    hashIcon: {
        fontSize: '0.75rem',
        fontWeight: '700',
        color: '#9ca3af',
        width: '13px',
        textAlign: 'center',
    },
    applianceRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
    },
    applianceInput: {
        padding: '0.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.8rem',
        color: '#374151',
        backgroundColor: '#f9fafb',
        outline: 'none',
        minWidth: 0,
    },
    addApplianceBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '0.5rem',
    },
    radioGroup: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2rem',
    },
    radioLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        cursor: 'pointer',
    },
    radioInputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    radioInput: {
        position: 'absolute',
        opacity: 0,
        width: 0,
        height: 0,
    },
    radioCircle: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
    },
    radioInner: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'white',
    },
    radioText: {
        fontSize: '1rem',
        fontWeight: '500',
        color: '#374151',
    },
    locationRow: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
    },
    submitBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#1a4a3a',
        color: 'white',
        border: 'none',
        borderRadius: '999px',
        fontSize: '0.875rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
    },
    footer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0',
        borderTop: '1px solid #e5e7eb',
        marginTop: '0.5rem',
    },
    footerLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    footerText: {
        fontSize: '0.75rem',
        color: '#9ca3af',
    },
    footerLinks: {
        display: 'flex',
        gap: '1rem',
    },
    footerLink: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        cursor: 'pointer',
    },
    systemStatus: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#16a34a',
    },
    statusText: {
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '500',
    },
};
