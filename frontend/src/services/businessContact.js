import { useEffect, useState } from 'react';
import api from '../api/axios';

// How the public can reach the business owner, from GET /api/contact:
//   email         the address the system sends emails from (null if it's a no-reply address)
//   messengerUrl  the owner's Messenger link (null until set in the admin inbox)
// Both stay null while loading or if the server can't be reached.
export function useBusinessContact() {
    const [contact, setContact] = useState({ email: null, messengerUrl: null });

    useEffect(() => {
        let cancelled = false;
        api.get('/contact')
            .then((res) => {
                if (!cancelled) setContact({ email: res.data.email || null, messengerUrl: res.data.messenger_url || null });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    return contact;
}
