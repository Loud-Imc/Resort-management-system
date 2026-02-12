
export const PERMISSIONS = {
    // Rooms Management
    ROOMS: {
        CREATE: 'rooms.create',
        READ: 'rooms.read',
        UPDATE: 'rooms.update',
        DELETE: 'rooms.delete',
        BLOCK: 'rooms.block', // For maintenance/owner use
    },

    // Room Types
    ROOM_TYPES: {
        CREATE: 'roomTypes.create',
        READ: 'roomTypes.read',
        UPDATE: 'roomTypes.update',
        DELETE: 'roomTypes.delete',
    },

    // Bookings
    BOOKINGS: {
        CREATE: 'bookings.create', // For manual/admin bookings
        READ: 'bookings.read',
        UPDATE: 'bookings.update',
        DELETE: 'bookings.delete',
        CHECK_IN: 'bookings.checkIn',
        CHECK_OUT: 'bookings.checkOut',
    },

    // Reports & Analytics
    REPORTS: {
        VIEW_DASHBOARD: 'reports.viewDashboard',
        VIEW_FINANCIAL: 'reports.viewFinancial',
        VIEW_OCCUPANCY: 'reports.viewOccupancy',
    },

    // Users & Access Control
    USERS: {
        CREATE: 'users.create',
        READ: 'users.read',
        UPDATE: 'users.update',
        DELETE: 'users.delete',
        MANAGE_ROLES: 'users.manageRoles',
    },

    // Roles Management
    ROLES: {
        CREATE: 'roles.create',
        READ: 'roles.read',
        UPDATE: 'roles.update',
        DELETE: 'roles.delete',
        ASSIGN_PERMISSIONS: 'roles.assignPermissions',
    },

    // Properties
    PROPERTIES: {
        CREATE: 'properties.create',
        READ: 'properties.read',
        UPDATE: 'properties.update',
        DELETE: 'properties.delete',
    },

    // Property Staff Integration
    PROPERTY_STAFF: {
        MANAGE: 'propertyStaff.manage', // Add/remove staff from property
    },

    // Payments
    PAYMENTS: {
        READ: 'payments.read',
        CREATE: 'payments.create',
        REFUND: 'payments.refund',
    },

    // Expenses
    EXPENSES: {
        CREATE: 'expenses.create',
        READ: 'expenses.read',
        UPDATE: 'expenses.update',
        DELETE: 'expenses.delete',
    },

    // Income
    INCOME: {
        CREATE: 'income.create',
        READ: 'income.read',
        UPDATE: 'income.update',
        DELETE: 'income.delete',
    },

    // Events
    EVENTS: {
        CREATE: 'events.create',
        READ: 'events.read',
        UPDATE: 'events.update',
        DELETE: 'events.delete',
        APPROVE: 'events.approve', // Admin approval for events
    },

    // Event Bookings
    EVENT_BOOKINGS: {
        READ: 'eventBookings.read',
        VERIFY: 'events.verify', // Scanning tickets
        VIEW_BOOKINGS: 'events.view_bookings', // Seeing attendee list
    },

    // Channel Partners
    CHANNEL_PARTNERS: {
        CREATE: 'channelPartners.create',
        READ: 'channelPartners.read',
        UPDATE: 'channelPartners.update',
        DELETE: 'channelPartners.delete',
    },

    // Booking Sources
    BOOKING_SOURCES: {
        CREATE: 'bookingSources.create',
        READ: 'bookingSources.read',
        UPDATE: 'bookingSources.update',
        DELETE: 'bookingSources.delete',
    },

    // Marketing (Coupons, etc.)
    MARKETING: {
        READ: 'marketing.read',
        MANAGE_COUPONS: 'marketing.manageCoupons',
        MANAGE_OFFERS: 'marketing.manageOffers',
    },

    // Configuration / Settings
    SETTINGS: {
        MANAGE: 'settings.manage',
    }
};

// Default Permission Groups (for seeding)
export const PERMISSION_GROUPS = {
    SUPER_ADMIN: Object.values(PERMISSIONS).flatMap(group => Object.values(group)), // All permissions

    ADMIN: [
        ...Object.values(PERMISSIONS.ROOMS),
        ...Object.values(PERMISSIONS.ROOM_TYPES),
        ...Object.values(PERMISSIONS.BOOKINGS),
        ...Object.values(PERMISSIONS.REPORTS),
        PERMISSIONS.USERS.READ, PERMISSIONS.USERS.CREATE, PERMISSIONS.USERS.UPDATE,
        PERMISSIONS.PROPERTIES.READ, PERMISSIONS.PROPERTIES.UPDATE,
        PERMISSIONS.PROPERTY_STAFF.MANAGE,
        ...Object.values(PERMISSIONS.PAYMENTS),
        ...Object.values(PERMISSIONS.EXPENSES),
        ...Object.values(PERMISSIONS.INCOME),
        ...Object.values(PERMISSIONS.EVENTS),
        ...Object.values(PERMISSIONS.EVENT_BOOKINGS),
        ...Object.values(PERMISSIONS.MARKETING),
    ],

    MANAGER: [
        PERMISSIONS.ROOMS.READ, PERMISSIONS.ROOMS.UPDATE, PERMISSIONS.ROOMS.BLOCK,
        ...Object.values(PERMISSIONS.BOOKINGS),
        PERMISSIONS.REPORTS.VIEW_DASHBOARD, PERMISSIONS.REPORTS.VIEW_OCCUPANCY,
        PERMISSIONS.PROPERTIES.READ,
        PERMISSIONS.PAYMENTS.READ,
        PERMISSIONS.EXPENSES.READ, PERMISSIONS.EXPENSES.CREATE,
        PERMISSIONS.INCOME.READ, PERMISSIONS.INCOME.CREATE,
        PERMISSIONS.EVENTS.READ,
        PERMISSIONS.EVENT_BOOKINGS.READ, PERMISSIONS.EVENT_BOOKINGS.VERIFY,
    ],

    STAFF: [
        PERMISSIONS.ROOMS.READ,
        PERMISSIONS.BOOKINGS.READ, PERMISSIONS.BOOKINGS.CHECK_IN, PERMISSIONS.BOOKINGS.CHECK_OUT,
        PERMISSIONS.REPORTS.VIEW_DASHBOARD,
        PERMISSIONS.PROPERTIES.READ,
        PERMISSIONS.EXPENSES.CREATE,
        PERMISSIONS.EVENT_BOOKINGS.VERIFY,
    ],

    PROPERTY_OWNER: [
        // Rooms: Full Control (Create/Read/Update/Block) for own property
        PERMISSIONS.ROOMS.CREATE, PERMISSIONS.ROOMS.READ, PERMISSIONS.ROOMS.UPDATE, PERMISSIONS.ROOMS.BLOCK,

        // Room Types: Read (to select type when creating room)
        ...Object.values(PERMISSIONS.ROOM_TYPES),

        // Bookings: Read & Check-in/out
        PERMISSIONS.BOOKINGS.READ,
        PERMISSIONS.BOOKINGS.CHECK_IN,
        PERMISSIONS.BOOKINGS.CHECK_OUT,

        // Reports: Financials & Dashboard
        ...Object.values(PERMISSIONS.REPORTS),

        // Properties: Read/Update own property
        PERMISSIONS.PROPERTIES.READ, PERMISSIONS.PROPERTIES.UPDATE,

        // Financials: Read Only
        PERMISSIONS.PAYMENTS.READ,
        PERMISSIONS.EXPENSES.READ,

        // Events: Full Control for own property
        PERMISSIONS.EVENTS.CREATE, PERMISSIONS.EVENTS.READ, PERMISSIONS.EVENTS.UPDATE,

        // Event Attendees & Check-in
        PERMISSIONS.EVENT_BOOKINGS.READ,
        PERMISSIONS.EVENT_BOOKINGS.VIEW_BOOKINGS,
        PERMISSIONS.EVENT_BOOKINGS.VERIFY,

        // Staff Management
        PERMISSIONS.USERS.READ, // To view their staff list
        PERMISSIONS.USERS.CREATE, // To create new team accounts
        PERMISSIONS.USERS.UPDATE, // To edit team accounts
        PERMISSIONS.USERS.DELETE, // To delete team accounts
        PERMISSIONS.PROPERTY_STAFF.MANAGE, // To add/remove staff
        PERMISSIONS.ROLES.READ, // To see available roles when creating users

        // Marketing: Offers
        PERMISSIONS.MARKETING.MANAGE_OFFERS,
    ],

    MARKETING: [
        PERMISSIONS.PROPERTIES.CREATE,
        PERMISSIONS.PROPERTIES.READ,
        PERMISSIONS.USERS.READ,
        PERMISSIONS.MARKETING.READ,
    ],

    EVENT_ORGANIZER: [
        PERMISSIONS.EVENTS.CREATE,
        PERMISSIONS.EVENTS.READ,
        PERMISSIONS.EVENTS.UPDATE,
        PERMISSIONS.EVENTS.DELETE,
        PERMISSIONS.EVENT_BOOKINGS.READ,
        PERMISSIONS.EVENT_BOOKINGS.VIEW_BOOKINGS,
    ],

    VERIFICATION_STAFF: [
        PERMISSIONS.EVENTS.READ,
        PERMISSIONS.EVENT_BOOKINGS.READ,
        PERMISSIONS.EVENT_BOOKINGS.VERIFY,
    ],

    CUSTOMER: [
        PERMISSIONS.BOOKINGS.READ,
        PERMISSIONS.EVENTS.READ,
        PERMISSIONS.EVENT_BOOKINGS.READ,
    ]
};
