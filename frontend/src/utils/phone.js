// How a mobile number is shown on the pages. Numbers are saved as +63…
// (e.g. +639171234567); people in the Philippines read them as 0917 123 4567.
// Anything that isn't a PH mobile number is shown as it was typed.
export const formatPhone = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');

    let local = null;
    if (digits.length === 12 && digits.startsWith('63')) local = `0${digits.slice(2)}`;
    else if (digits.length === 11 && digits.startsWith('0')) local = digits;
    else if (digits.length === 10 && digits.startsWith('9')) local = `0${digits}`;

    return local ? local.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3') : String(value);
};
