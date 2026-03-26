// ============================================================================
// QuixZoom Mobile — UX Flow State Machines
//
// Each flow is a finite state machine that the mobile app follows.
// Backend drives the state, frontend renders it.
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export interface UXFlow {
  name: string;
  description: string;
  entry: string;
  states: Record<string, UXState>;
}

export interface UXState {
  screen: string;
  title: string;
  actions: Record<string, UXAction>;
  auto_transition?: { condition: string; next: string };
}

export interface UXAction {
  label: string;
  icon?: string;
  next: string;
  api_call?: string;
  haptic?: 'light' | 'medium' | 'heavy' | 'success' | 'error';
  animation?: string;
}

// ============================================================================
// FLOW 1: First-time User Onboarding
// ============================================================================

export const ONBOARDING_FLOW: UXFlow = {
  name: 'onboarding',
  description: 'First-time user experience — GPS permission, profile, first task',
  entry: 'welcome',
  states: {
    welcome: {
      screen: 'OnboardingWelcome',
      title: 'Welcome to QuixZoom',
      actions: {
        next: { label: 'Get Started', next: 'permissions', haptic: 'medium' },
      },
    },
    permissions: {
      screen: 'OnboardingPermissions',
      title: 'Enable Location & Camera',
      actions: {
        grant_all: { label: 'Enable', next: 'profile_setup', haptic: 'success' },
        skip: { label: 'Skip for now', next: 'profile_setup' },
      },
    },
    profile_setup: {
      screen: 'OnboardingProfile',
      title: 'Your Profile',
      actions: {
        save: {
          label: 'Continue',
          next: 'first_package',
          api_call: 'POST /api/qz/users',
          haptic: 'success',
        },
      },
    },
    first_package: {
      screen: 'OnboardingFirstPackage',
      title: 'Your First Package',
      actions: {
        claim: {
          label: 'Claim it — Earn your first kr!',
          next: 'tutorial_capture',
          api_call: 'POST /api/cis/packages/{id}/claim',
          haptic: 'heavy',
        },
        explore_first: { label: 'Explore map first', next: 'done' },
      },
    },
    tutorial_capture: {
      screen: 'OnboardingCaptureTutorial',
      title: 'How to Capture',
      actions: {
        start: { label: 'Start Capturing', next: 'done', haptic: 'medium' },
      },
    },
    done: {
      screen: 'ExploreMap',
      title: '',
      actions: {},
    },
  },
};

// ============================================================================
// FLOW 2: Package Completion (the main earning loop)
// ============================================================================

export const PACKAGE_COMPLETION_FLOW: UXFlow = {
  name: 'package-completion',
  description: 'Claim → Capture → Submit → Payout — the core dopamine loop',
  entry: 'browsing',
  states: {
    browsing: {
      screen: 'PackageList',
      title: 'Available Packages',
      actions: {
        select: { label: 'View Package', next: 'detail' },
        generate: {
          label: 'Find packages here',
          next: 'browsing',
          api_call: 'POST /api/cis/packages/generate',
          haptic: 'medium',
        },
      },
    },
    detail: {
      screen: 'PackageDetail',
      title: 'Package Details',
      actions: {
        claim: {
          label: 'Claim — {payout} kr',
          next: 'navigating',
          api_call: 'POST /api/cis/packages/{id}/claim',
          haptic: 'heavy',
          animation: 'pulse_green',
        },
        back: { label: 'Back', next: 'browsing' },
      },
    },
    navigating: {
      screen: 'CaptureSession',
      title: 'Navigate to Location',
      actions: {
        arrived: { label: 'Start Capturing', next: 'capturing', haptic: 'medium' },
        abandon: { label: 'Release Package', next: 'browsing' },
      },
      auto_transition: { condition: 'distance_to_target < 50m', next: 'capturing' },
    },
    capturing: {
      screen: 'CaptureSession',
      title: 'Capture Photos',
      actions: {
        capture: {
          label: 'Capture',
          next: 'capturing',
          api_call: 'POST /api/qz/images',
          haptic: 'light',
          animation: 'shutter_flash',
        },
        review: { label: 'Review All', next: 'reviewing' },
      },
      auto_transition: { condition: 'captured_count >= required_count', next: 'reviewing' },
    },
    reviewing: {
      screen: 'CaptureReview',
      title: 'Review & Submit',
      actions: {
        submit: {
          label: 'Submit for Payout',
          next: 'processing',
          api_call: 'POST /api/qz/tasks/assignments/{id}/submit',
          haptic: 'heavy',
        },
        retake: { label: 'Retake Photos', next: 'capturing' },
      },
    },
    processing: {
      screen: 'ProcessingScreen',
      title: 'Analyzing...',
      actions: {},
      auto_transition: { condition: 'analysis_complete', next: 'payout' },
    },
    payout: {
      screen: 'PayoutCelebration',
      title: '',
      actions: {
        next_package: { label: 'Find Next Package', next: 'browsing', haptic: 'medium' },
        add_to_ir: { label: 'Add to IR', next: 'ir_add' },
        withdraw: { label: 'Withdraw', next: 'withdraw' },
      },
    },
    ir_add: {
      screen: 'IRCreate',
      title: 'Add to Intelligence Repo',
      actions: {},
    },
    withdraw: {
      screen: 'Withdraw',
      title: 'Withdraw Funds',
      actions: {},
    },
  },
};

// ============================================================================
// FLOW 3: IR Creation (the moat)
// ============================================================================

export const IR_CREATION_FLOW: UXFlow = {
  name: 'ir-creation',
  description: 'Creator builds a structured dataset for the marketplace',
  entry: 'define',
  states: {
    define: {
      screen: 'IRCreate',
      title: 'Define Your Dataset',
      actions: {
        create: {
          label: 'Create Repo',
          next: 'populating',
          api_call: 'POST /api/qz/ir',
          haptic: 'success',
        },
      },
    },
    populating: {
      screen: 'IRPopulate',
      title: 'Add Data Points',
      actions: {
        add_from_captures: { label: 'Add from captures', next: 'populating' },
        capture_new: { label: 'Capture new data', next: 'capture_for_ir' },
        request_analysis: {
          label: 'Analyze & Score',
          next: 'analyzing',
          api_call: 'POST /api/workflow/transition',
          haptic: 'medium',
        },
      },
    },
    capture_for_ir: {
      screen: 'CaptureSession',
      title: 'Capture for IR',
      actions: {
        done: { label: 'Back to IR', next: 'populating' },
      },
    },
    analyzing: {
      screen: 'IRAnalyzing',
      title: 'AI Analysis',
      actions: {},
      auto_transition: { condition: 'analysis_complete', next: 'review' },
    },
    review: {
      screen: 'IRReview',
      title: 'Review Quality',
      actions: {
        publish: {
          label: 'Publish to Marketplace',
          next: 'pricing',
          haptic: 'heavy',
        },
        add_more: { label: 'Add More Data', next: 'populating' },
      },
    },
    pricing: {
      screen: 'IRPricing',
      title: 'Set Your Price',
      actions: {
        confirm: {
          label: 'Publish — {price} kr',
          next: 'published',
          api_call: 'POST /api/qz/ir/{id}/publish',
          haptic: 'success',
          animation: 'confetti',
        },
      },
    },
    published: {
      screen: 'IRPublished',
      title: 'Published!',
      actions: {
        view_listing: { label: 'View Listing', next: 'listing' },
        create_another: { label: 'Create Another', next: 'define' },
      },
    },
    listing: {
      screen: 'ListingDetail',
      title: 'Your Listing',
      actions: {},
    },
  },
};

// ============================================================================
// FLOW 4: Buyer Purchase (for the marketplace buyer side)
// ============================================================================

export const BUYER_PURCHASE_FLOW: UXFlow = {
  name: 'buyer-purchase',
  description: 'Buyer discovers and purchases intelligence data',
  entry: 'search',
  states: {
    search: {
      screen: 'Marketplace',
      title: 'Find Intelligence',
      actions: {
        view: { label: 'View Listing', next: 'detail' },
        filter: { label: 'Filter', next: 'search' },
      },
    },
    detail: {
      screen: 'ListingDetail',
      title: 'Data Package',
      actions: {
        purchase: {
          label: 'Purchase — {price} kr',
          next: 'checkout',
          haptic: 'medium',
        },
        preview_leads: { label: 'Preview Leads', next: 'lead_preview' },
      },
    },
    lead_preview: {
      screen: 'LeadPreview',
      title: 'Lead Preview',
      actions: {
        purchase: { label: 'Purchase Full Access', next: 'checkout' },
        back: { label: 'Back', next: 'detail' },
      },
    },
    checkout: {
      screen: 'BuyerCheckout',
      title: 'Checkout',
      actions: {
        pay: {
          label: 'Pay {amount} kr',
          next: 'purchased',
          api_call: 'POST /api/cis/marketplace/purchase',
          haptic: 'success',
        },
        cancel: { label: 'Cancel', next: 'detail' },
      },
    },
    purchased: {
      screen: 'PurchaseSuccess',
      title: 'Access Granted',
      actions: {
        view_leads: { label: 'View Leads', next: 'leads' },
        download: { label: 'Download Data', next: 'purchased' },
      },
    },
    leads: {
      screen: 'LeadView',
      title: 'Your Leads',
      actions: {
        contact: { label: 'Contact', next: 'leads' },
        export: { label: 'Export CSV', next: 'leads' },
      },
    },
  },
};

// ============================================================================
// All flows
// ============================================================================

export const ALL_FLOWS = {
  onboarding: ONBOARDING_FLOW,
  packageCompletion: PACKAGE_COMPLETION_FLOW,
  irCreation: IR_CREATION_FLOW,
  buyerPurchase: BUYER_PURCHASE_FLOW,
} as const;
