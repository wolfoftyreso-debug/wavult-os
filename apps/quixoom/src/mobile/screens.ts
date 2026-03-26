// ============================================================================
// QuixZoom Mobile — Screen Definitions & Navigation
//
// Defines the complete mobile app UX as typed screen configs.
// Used by React Native / Expo app to render the correct UI.
//
// Design principles:
//   - Instant feedback (< 100ms perceived)
//   - Dopamine loops (payout animations, streak visuals)
//   - Map-first interaction
//   - Clear progression (level bar always visible)
//   - "Built for a zoomer" — minimal text, maximum visuals
// ============================================================================

// ============================================================================
// Navigation Structure
// ============================================================================

export const NAVIGATION = {
  tabs: [
    { key: 'explore',     icon: 'map',           label: 'Explore' },
    { key: 'packages',    icon: 'package',       label: 'Earn' },
    { key: 'capture',     icon: 'camera',        label: 'Capture' },
    { key: 'intelligence', icon: 'brain',        label: 'Intel' },
    { key: 'wallet',      icon: 'wallet',        label: 'Wallet' },
  ],

  stacks: {
    explore: [
      'ExploreMap',
      'AreaDetail',
      'PackageDetail',
      'CreatorProfile',
    ],
    packages: [
      'PackageList',
      'PackageDetail',
      'CaptureSession',
      'CaptureReview',
      'PayoutCelebration',
    ],
    capture: [
      'CameraView',
      'CapturePreview',
      'CaptureSubmit',
    ],
    intelligence: [
      'IRDashboard',
      'IRCreate',
      'IRPopulate',
      'IRDetail',
      'Marketplace',
      'ListingDetail',
      'LeadView',
    ],
    wallet: [
      'WalletHome',
      'TransactionHistory',
      'Withdraw',
      'WithdrawSuccess',
      'LevelProgress',
      'StreakDetail',
    ],
  },

  modals: [
    'PayoutAnimation',      // full-screen payout celebration
    'LevelUpModal',         // level upgrade animation
    'StreakMilestone',       // streak milestone celebration
    'PackageClaimConfirm',  // confirm before claiming
    'WithdrawConfirm',      // confirm withdrawal
    'IRPublishConfirm',     // confirm IR publish
  ],
} as const;

// ============================================================================
// Screen Definitions
// ============================================================================

export interface ScreenDef {
  key: string;
  title: string;
  description: string;
  components: ComponentDef[];
  data_sources: string[];     // which API calls feed this screen
  transitions: TransitionDef[];
}

export interface ComponentDef {
  type: string;
  props?: Record<string, unknown>;
  position?: 'header' | 'body' | 'footer' | 'overlay' | 'fab';
}

export interface TransitionDef {
  trigger: string;
  target: string;
  animation?: 'slide' | 'fade' | 'modal' | 'push';
}

// ============================================================================
// TAB 1: EXPLORE (Map-first discovery)
// ============================================================================

export const EXPLORE_MAP: ScreenDef = {
  key: 'ExploreMap',
  title: 'Explore',
  description: 'Full-screen map showing nearby packages, hot zones, and earnings potential',
  components: [
    { type: 'MapView', position: 'body', props: {
      showUserLocation: true,
      clusterPackages: true,
      showHeatmap: true,       // demand heatmap overlay
      showRoute: false,        // toggleable
    }},
    { type: 'MapPackagePin', props: {
      colorByValue: true,      // green=low, yellow=mid, red=hot
      showPayout: true,        // "45 kr" label on pin
    }},
    { type: 'EarningsBar', position: 'header', props: {
      showDailyEarnings: true,
      showStreak: true,
      showLevel: true,
    }},
    { type: 'QuickFilters', position: 'header', props: {
      filters: ['All', '🔥 Hot', '💰 Quick', '🧠 IR', '🔁 Recurring'],
    }},
    { type: 'BottomSheet', position: 'overlay', props: {
      snapPoints: ['15%', '50%', '90%'],
      defaultSnap: '15%',
      content: 'NearbyPackageList',
    }},
    { type: 'GenerateButton', position: 'fab', props: {
      label: 'Find packages here',
      icon: 'sparkle',
    }},
  ],
  data_sources: [
    'GET /api/cis/packages/nearby?lat={lat}&lng={lng}',
    'GET /api/qz/streak/{userId}',
    'GET /api/qz/wallet/{userId}',
  ],
  transitions: [
    { trigger: 'tap_pin', target: 'PackageDetail', animation: 'modal' },
    { trigger: 'tap_generate', target: 'PackageList', animation: 'push' },
    { trigger: 'tap_area', target: 'AreaDetail', animation: 'push' },
  ],
};

// ============================================================================
// TAB 2: EARN (Package List)
// ============================================================================

export const PACKAGE_LIST: ScreenDef = {
  key: 'PackageList',
  title: 'Earn',
  description: 'Scrollable list of available photo packages, sorted by value',
  components: [
    { type: 'SegmentControl', position: 'header', props: {
      segments: ['For You', 'Nearby', 'High Value', 'Quick'],
    }},
    { type: 'PackageCard', position: 'body', props: {
      showLabel: true,        // "🔥 Hot Demand"
      showPayout: true,       // "180 kr"
      showDistance: true,      // "120m away"
      showTime: true,         // "~25 min"
      showImageCount: true,   // "6 photos"
      showBuyerSegments: true, // "Fönsterputsare, retail"
      swipeToReveal: true,    // swipe right to claim
    }},
    { type: 'EarningsSummary', position: 'header', props: {
      metric: 'today_potential',
      label: 'You could earn',
    }},
  ],
  data_sources: [
    'POST /api/cis/packages/generate',
    'GET /api/qz/levels',
  ],
  transitions: [
    { trigger: 'tap_package', target: 'PackageDetail', animation: 'push' },
    { trigger: 'swipe_claim', target: 'PackageClaimConfirm', animation: 'modal' },
  ],
};

export const PACKAGE_DETAIL: ScreenDef = {
  key: 'PackageDetail',
  title: 'Package Detail',
  description: 'Full package info with map route, payout breakdown, instructions',
  components: [
    { type: 'MiniMap', position: 'header', props: {
      showRoute: true,
      showWaypoints: true,
      fitToRoute: true,
    }},
    { type: 'PayoutBreakdown', position: 'body', props: {
      showBase: true,
      showMultipliers: true,  // value × streak × level
      showBonuses: true,      // time + quality
      animateTotal: true,     // count-up animation
    }},
    { type: 'InstructionList', position: 'body', props: {
      showSteps: true,        // "1. Walk to location 2. Photo storefront..."
      showExamples: true,     // example good/bad photos
    }},
    { type: 'BuyerInfo', position: 'body', props: {
      showSegments: true,
      showWhyValuable: true,  // "Window cleaners need this data"
    }},
    { type: 'ClaimButton', position: 'footer', props: {
      label: 'Claim Package — {payout} kr',
      style: 'primary_large',
      hapticFeedback: true,
    }},
  ],
  data_sources: [
    'GET /api/cis/packages/{id}',
    'POST /api/cis/pricing/payout',
  ],
  transitions: [
    { trigger: 'claim', target: 'CaptureSession', animation: 'push' },
    { trigger: 'back', target: 'PackageList', animation: 'slide' },
  ],
};

// ============================================================================
// TAB 3: CAPTURE (Camera Experience)
// ============================================================================

export const CAPTURE_SESSION: ScreenDef = {
  key: 'CaptureSession',
  title: 'Capture',
  description: 'Full-screen camera with AR overlay, progress tracker, and guidance',
  components: [
    { type: 'CameraViewfinder', position: 'body', props: {
      showGrid: true,
      showLevelGuide: true,    // AR overlay showing what to capture
      showGPS: true,
      autoFocus: true,
      maxZoom: 5,
    }},
    { type: 'CaptureProgress', position: 'header', props: {
      showCount: true,         // "3 of 6 photos"
      showProgressBar: true,
      showNextTarget: true,    // "Next: Entrance sign"
      pulseOnComplete: true,
    }},
    { type: 'CaptureTimer', position: 'header', props: {
      showTimeRemaining: true,
      warnAt: 300,             // warn at 5 min remaining
    }},
    { type: 'DirectionArrow', position: 'overlay', props: {
      pointToNextTarget: true,
      showDistance: true,
    }},
    { type: 'ShutterButton', position: 'footer', props: {
      size: 'large',
      hapticOnCapture: true,
      showPreviewAfter: true,
      animateSuccess: true,    // green pulse on good capture
    }},
    { type: 'MiniEarnings', position: 'footer', props: {
      showRunningTotal: true,  // "+45 kr so far"
      animateIncrement: true,
    }},
  ],
  data_sources: [
    'POST /api/qz/images',
    'POST /api/qz/images/{id}/analyze',
  ],
  transitions: [
    { trigger: 'capture', target: 'CapturePreview', animation: 'fade' },
    { trigger: 'all_captured', target: 'CaptureReview', animation: 'push' },
    { trigger: 'abandon', target: 'PackageList', animation: 'slide' },
  ],
};

export const CAPTURE_REVIEW: ScreenDef = {
  key: 'CaptureReview',
  title: 'Review & Submit',
  description: 'Review all captures before submission, see AI quality scores',
  components: [
    { type: 'ImageGrid', position: 'body', props: {
      showAIScore: true,       // green/yellow/red quality indicator
      showLocation: true,
      allowRetake: true,
      allowReorder: true,
    }},
    { type: 'QualityMeter', position: 'header', props: {
      showOverallScore: true,
      showBonusEligible: true, // "Quality bonus: +12 kr"
    }},
    { type: 'SubmitButton', position: 'footer', props: {
      label: 'Submit for Review',
      showEstimatedPayout: true,
    }},
  ],
  data_sources: [],
  transitions: [
    { trigger: 'submit', target: 'PayoutCelebration', animation: 'modal' },
    { trigger: 'retake', target: 'CaptureSession', animation: 'slide' },
  ],
};

// ============================================================================
// PAYOUT CELEBRATION (the dopamine hit)
// ============================================================================

export const PAYOUT_CELEBRATION: ScreenDef = {
  key: 'PayoutCelebration',
  title: '',
  description: 'Full-screen payout animation — confetti, count-up, streak update',
  components: [
    { type: 'ConfettiAnimation', position: 'overlay' },
    { type: 'PayoutCountUp', position: 'body', props: {
      fromZero: true,
      duration: 2000,          // 2 second count-up
      showCurrency: true,
      fontSize: 'giant',       // 72pt+
      hapticOnComplete: true,
    }},
    { type: 'StreakUpdate', position: 'body', props: {
      showCurrentStreak: true,
      showMultiplier: true,
      animateIfMilestone: true, // extra celebration if streak milestone
    }},
    { type: 'LevelProgress', position: 'body', props: {
      showProgressBar: true,
      showNextLevel: true,
      animateProgress: true,
    }},
    { type: 'NextAction', position: 'footer', props: {
      options: [
        { label: 'Find next package', action: 'explore' },
        { label: 'Add to IR', action: 'ir_add' },
        { label: 'Withdraw', action: 'withdraw' },
      ],
    }},
  ],
  data_sources: [
    'POST /api/qz/tasks/assignments/{id}/approve',
    'GET /api/qz/wallet/{userId}',
    'GET /api/qz/streak/{userId}',
  ],
  transitions: [
    { trigger: 'explore', target: 'ExploreMap', animation: 'slide' },
    { trigger: 'ir_add', target: 'IRCreate', animation: 'push' },
    { trigger: 'withdraw', target: 'Withdraw', animation: 'push' },
    { trigger: 'dismiss', target: 'PackageList', animation: 'fade' },
  ],
};

// ============================================================================
// TAB 4: INTELLIGENCE (IR Dashboard)
// ============================================================================

export const IR_DASHBOARD: ScreenDef = {
  key: 'IRDashboard',
  title: 'Intelligence',
  description: 'Creator\'s IR portfolio — their datasets, revenue, leads',
  components: [
    { type: 'IRRevenueCard', position: 'header', props: {
      showTotalRevenue: true,
      showThisMonth: true,
      showActiveSubs: true,
    }},
    { type: 'SegmentControl', position: 'header', props: {
      segments: ['My Repos', 'Marketplace', 'Leads'],
    }},
    { type: 'IRCardList', position: 'body', props: {
      showStatus: true,
      showStats: true,         // images, leads, revenue
      showCoverImage: true,
      showQualityBadge: true,
    }},
    { type: 'CreateIRButton', position: 'fab', props: {
      label: 'New Intelligence Repo',
      icon: 'plus',
    }},
  ],
  data_sources: [
    'GET /api/qz/ir/search?creator={userId}',
    'GET /api/cis/marketplace/search?seller={userId}',
  ],
  transitions: [
    { trigger: 'tap_repo', target: 'IRDetail', animation: 'push' },
    { trigger: 'tap_create', target: 'IRCreate', animation: 'modal' },
    { trigger: 'tap_marketplace', target: 'Marketplace', animation: 'push' },
  ],
};

export const MARKETPLACE: ScreenDef = {
  key: 'Marketplace',
  title: 'Marketplace',
  description: 'Browse and purchase intelligence data',
  components: [
    { type: 'SearchBar', position: 'header', props: {
      placeholder: 'Search facades, storefronts, areas...',
      showFilters: true,
    }},
    { type: 'CategoryChips', position: 'header', props: {
      categories: ['Retail', 'Property', 'Parking', 'Signage', 'Construction'],
    }},
    { type: 'ListingGrid', position: 'body', props: {
      columns: 2,
      showCover: true,
      showPrice: true,
      showRating: true,
      showLeadCount: true,
      showBuyerTag: true,
    }},
    { type: 'SortControl', position: 'header', props: {
      options: ['Relevance', 'Price ↓', 'Price ↑', 'Newest', 'Popular'],
    }},
  ],
  data_sources: [
    'GET /api/cis/marketplace/search',
  ],
  transitions: [
    { trigger: 'tap_listing', target: 'ListingDetail', animation: 'push' },
    { trigger: 'search', target: 'Marketplace', animation: 'fade' },
  ],
};

// ============================================================================
// TAB 5: WALLET
// ============================================================================

export const WALLET_HOME: ScreenDef = {
  key: 'WalletHome',
  title: 'Wallet',
  description: 'Wallet overview with balance, recent transactions, quick actions',
  components: [
    { type: 'BalanceCard', position: 'header', props: {
      showAvailable: true,
      showPending: true,
      showLocked: true,
      animateBalance: true,
      showCurrency: true,
      gradient: ['#6366f1', '#8b5cf6'], // purple gradient
    }},
    { type: 'QuickActions', position: 'body', props: {
      actions: [
        { label: 'Withdraw', icon: 'arrow-up', action: 'withdraw' },
        { label: 'Invest', icon: 'trending-up', action: 'invest' },
        { label: 'History', icon: 'clock', action: 'history' },
      ],
    }},
    { type: 'EarningsChart', position: 'body', props: {
      period: 'week',         // toggle: day/week/month
      showTrend: true,
      showAverage: true,
    }},
    { type: 'TransactionList', position: 'body', props: {
      limit: 10,
      showType: true,
      showAmount: true,
      colorByType: true,       // green=income, red=expense
      showTimestamp: true,
    }},
    { type: 'LevelBadge', position: 'header', props: {
      showName: true,
      showProgress: true,
      tapToExpand: true,
    }},
    { type: 'StreakIndicator', position: 'header', props: {
      showFlame: true,         // 🔥 icon
      showCount: true,
      showMultiplier: true,
      pulseIfActive: true,
    }},
  ],
  data_sources: [
    'GET /api/qz/wallet/{userId}',
    'GET /api/qz/wallet/{userId}/transactions?limit=10',
    'GET /api/qz/streak/{userId}',
    'GET /api/qz/users/{userId}',
  ],
  transitions: [
    { trigger: 'withdraw', target: 'Withdraw', animation: 'push' },
    { trigger: 'history', target: 'TransactionHistory', animation: 'push' },
    { trigger: 'tap_level', target: 'LevelProgress', animation: 'modal' },
    { trigger: 'tap_streak', target: 'StreakDetail', animation: 'modal' },
  ],
};

// ============================================================================
// All screens exported
// ============================================================================

export const ALL_SCREENS = {
  ExploreMap: EXPLORE_MAP,
  PackageList: PACKAGE_LIST,
  PackageDetail: PACKAGE_DETAIL,
  CaptureSession: CAPTURE_SESSION,
  CaptureReview: CAPTURE_REVIEW,
  PayoutCelebration: PAYOUT_CELEBRATION,
  IRDashboard: IR_DASHBOARD,
  Marketplace: MARKETPLACE,
  WalletHome: WALLET_HOME,
} as const;
