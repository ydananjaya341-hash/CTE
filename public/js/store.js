// Central reactive state
export const store = {
    EMPLOYEES: {},
    SYSTEM_USERS: {},
    WEEKLY_PRICES: { Monday: 80, Tuesday: 80, Wednesday: 80, Thursday: 80, Friday: 80, Saturday: 80, Sunday: 80 },
    currentUser: null,
    loggedInSysUser: null,
    currentRole: null,
    isEditing: false,
    currentPhotoBase64: null,
    dataLoaded: false,
    unsubscribeCanteen: null,
    unsubscribeSecurity: null,
    unsubscribeReport: null,
};