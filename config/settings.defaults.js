let defaultFeatures, docUpdaterPort, siteUrl, v1Api
const http = require('http')
http.globalAgent.maxSockets = 300

// Make time interval config easier.
const seconds = 1000
const minutes = 60 * seconds

// These credentials are used for authenticating api requests
// between services that may need to go over public channels
const httpAuthUser = process.env.WEB_API_USER
const httpAuthPass = process.env.WEB_API_PASSWORD
const httpAuthUsers = {}
if (httpAuthUser && httpAuthPass) {
  httpAuthUsers[httpAuthUser] = httpAuthPass
}

const sessionSecret = process.env.SESSION_SECRET || 'secret-please-change'

if (process.env.V1_API_URL || process.env.V1_HOST) {
  v1Api = {
    url: process.env.V1_API_URL || `http://${process.env.V1_HOST}:5000`,
    user: process.env.V1_API_USER,
    pass: process.env.V1_API_PASSWORD,
  }
} else {
  v1Api = {
    url: undefined,
    user: undefined,
    pass: undefined,
  }
}

const intFromEnv = function (name, defaultValue) {
  if (
    [null, undefined].includes(defaultValue) ||
    typeof defaultValue !== 'number'
  ) {
    throw new Error(
      `Bad default integer value for setting: ${name}, ${defaultValue}`
    )
  }
  return parseInt(process.env[name], 10) || defaultValue
}

const defaultTextExtensions = [
  'tex',
  'latex',
  'sty',
  'cls',
  'bst',
  'bib',
  'bibtex',
  'txt',
  'tikz',
  'mtx',
  'rtex',
  'md',
  'asy',
  'latexmkrc',
  'lbx',
  'bbx',
  'cbx',
  'm',
  'lco',
  'dtx',
  'ins',
  'ist',
  'def',
  'clo',
  'ldf',
  'rmd',
  'lua',
  'gv',
  'mf',
  'yml',
  'yaml',
]

const parseTextExtensions = function (extensions) {
  if (extensions) {
    return extensions.split(',').map(ext => ext.trim())
  } else {
    return []
  }
}

module.exports = {
  allowAnonymousReadAndWriteSharing:
    process.env.SHARELATEX_ALLOW_ANONYMOUS_READ_AND_WRITE_SHARING === 'true',

  // Databases
  // ---------
  mongo: {
    options: {
      appname: 'web',
      useUnifiedTopology:
        (process.env.MONGO_USE_UNIFIED_TOPOLOGY || 'true') === 'true',
      poolSize: parseInt(process.env.MONGO_POOL_SIZE, 10) || 10,
      serverSelectionTimeoutMS:
        parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT, 10) || 60000,
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT, 10) || 30000,
    },
    url:
      process.env.MONGO_CONNECTION_STRING ||
      process.env.MONGO_URL ||
      `mongodb://${process.env.MONGO_HOST || '127.0.0.1'}/sharelatex`,
  },

  redis: {
    web: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      password: process.env.REDIS_PASSWORD || '',
      maxRetriesPerRequest: parseInt(
        process.env.REDIS_MAX_RETRIES_PER_REQUEST || '20'
      ),
    },

    // websessions:
    // 	cluster: [
    // 		{host: 'localhost', port: 7000}
    // 		{host: 'localhost', port: 7001}
    // 		{host: 'localhost', port: 7002}
    // 		{host: 'localhost', port: 7003}
    // 		{host: 'localhost', port: 7004}
    // 		{host: 'localhost', port: 7005}
    // 	]

    // ratelimiter:
    // 	cluster: [
    // 		{host: 'localhost', port: 7000}
    // 		{host: 'localhost', port: 7001}
    // 		{host: 'localhost', port: 7002}
    // 		{host: 'localhost', port: 7003}
    // 		{host: 'localhost', port: 7004}
    // 		{host: 'localhost', port: 7005}
    // 	]

    // cooldown:
    // 	cluster: [
    // 		{host: 'localhost', port: 7000}
    // 		{host: 'localhost', port: 7001}
    // 		{host: 'localhost', port: 7002}
    // 		{host: 'localhost', port: 7003}
    // 		{host: 'localhost', port: 7004}
    // 		{host: 'localhost', port: 7005}
    // 	]

    api: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379',
      password: process.env.REDIS_PASSWORD || '',
      maxRetriesPerRequest: parseInt(
        process.env.REDIS_MAX_RETRIES_PER_REQUEST || '20'
      ),
    },

    queues: {
      host: process.env.QUEUES_REDIS_HOST || 'localhost',
      port: process.env.QUEUES_REDIS_PORT || '6379',
      password: process.env.QUEUES_REDIS_PASSWORD || '',
    },
  },

  // Service locations
  // -----------------

  // Configure which ports to run each service on. Generally you
  // can leave these as they are unless you have some other services
  // running which conflict, or want to run the web process on port 80.
  internal: {
    web: {
      port: process.env.WEB_PORT || 3000,
      host: process.env.LISTEN_ADDRESS || 'localhost',
    },
    documentupdater: {
      port: (docUpdaterPort = 3003),
    },
  },

  gitBridgePublicBaseUrl: `http://${
    process.env.GIT_BRIDGE_HOST || 'localhost'
  }:8000`,

  // Tell each service where to find the other services. If everything
  // is running locally then this is easy, but they exist as separate config
  // options incase you want to run some services on remote hosts.
  apis: {
    web: {
      url: `http://${
        process.env.WEB_API_HOST || process.env.WEB_HOST || 'localhost'
      }:${process.env.WEB_API_PORT || process.env.WEB_PORT || 3000}`,
      user: httpAuthUser,
      pass: httpAuthPass,
    },
    documentupdater: {
      url: `http://${
        process.env.DOCUPDATER_HOST ||
        process.env.DOCUMENT_UPDATER_HOST ||
        'localhost'
      }:${docUpdaterPort}`,
    },
    thirdPartyDataStore: {
      url: `http://${process.env.TPDS_HOST || 'localhost'}:3002`,
      emptyProjectFlushDelayMiliseconds: 5 * seconds,
      dropboxApp: process.env.TPDS_DROPBOX_APP,
    },
    tags: {
      url: `http://${process.env.TAGS_HOST || 'localhost'}:3012`,
    },
    spelling: {
      url: `http://${process.env.SPELLING_HOST || 'localhost'}:3005`,
      host: process.env.SPELLING_HOST,
    },
    trackchanges: {
      url: `http://${process.env.TRACK_CHANGES_HOST || 'localhost'}:3015`,
    },
    project_history: {
      sendProjectStructureOps:
        process.env.PROJECT_HISTORY_ENABLED === 'true' || false,
      initializeHistoryForNewProjects:
        process.env.PROJECT_HISTORY_ENABLED === 'true' || false,
      displayHistoryForNewProjects:
        process.env.PROJECT_HISTORY_ENABLED === 'true' || false,
      url: `http://${process.env.PROJECT_HISTORY_HOST || 'localhost'}:3054`,
    },
    docstore: {
      url: `http://${process.env.DOCSTORE_HOST || 'localhost'}:3016`,
      pubUrl: `http://${process.env.DOCSTORE_HOST || 'localhost'}:3016`,
    },
    chat: {
      internal_url: `http://${process.env.CHAT_HOST || 'localhost'}:3010`,
    },
    blog: {
      url: 'http://localhost:3008',
      port: 3008,
    },
    university: {
      url: 'http://localhost:3011',
    },
    filestore: {
      url: `http://${process.env.FILESTORE_HOST || 'localhost'}:3009`,
    },
    clsi: {
      url: `http://${process.env.CLSI_HOST || 'localhost'}:3013`,
      // url: "http://#{process.env['CLSI_LB_HOST']}:3014"
      backendGroupName: undefined,
    },
    templates: {
      url: `http://${process.env.TEMPLATES_HOST || 'localhost'}:3007`,
    },
    githubSync: {
      url: `http://${process.env.GITHUB_SYNC_HOST || 'localhost'}:3022`,
    },
    recurly: {
      apiKey: process.env.RECURLY_API_KEY || '',
      apiVersion: process.env.RECURLY_API_VERSION,
      subdomain: process.env.RECURLY_SUBDOMAIN || '',
      publicKey: process.env.RECURLY_PUBLIC_KEY || '',
      webhookUser: process.env.RECURLY_WEBHOOK_USER,
      webhookPass: process.env.RECURLY_WEBHOOK_PASS,
    },
    geoIpLookup: {
      url: `http://${
        process.env.GEOIP_HOST || process.env.FREEGEOIP_HOST || 'localhost'
      }:8080/json/`,
    },
    realTime: {
      url: `http://${process.env.REALTIME_HOST || 'localhost'}:3026`,
    },
    contacts: {
      url: `http://${process.env.CONTACTS_HOST || 'localhost'}:3036`,
    },
    sixpack: {
      url: '',
    },
    references: {
      url:
        process.env.REFERENCES_HOST != null
          ? `http://${process.env.REFERENCES_HOST}:3040`
          : undefined,
    },
    notifications: {
      url: `http://${process.env.NOTIFICATIONS_HOST || 'localhost'}:3042`,
    },
    analytics: {
      url: `http://${process.env.ANALYTICS_HOST || 'localhost'}:3050`,
    },
    linkedUrlProxy: {
      url: process.env.LINKED_URL_PROXY,
    },
    thirdpartyreferences: {
      url: `http://${
        process.env.THIRD_PARTY_REFERENCES_HOST || 'localhost'
      }:3046`,
      timeout: parseInt(
        process.env.THIRD_PARTY_REFERENCES_TIMEOUT || '30000',
        10
      ),
    },
    v1: {
      url: v1Api.url,
      user: v1Api.user,
      pass: v1Api.pass,
    },
    v1_history: {
      url: `http://${process.env.V1_HISTORY_HOST || 'localhost'}:3100/api`,
      user: process.env.V1_HISTORY_USER || 'staging',
      pass: process.env.V1_HISTORY_PASSWORD || 'password',
    },
  },

  templates: {
    user_id: process.env.TEMPLATES_USER_ID || '5395eb7aad1f29a88756c7f2',
    showSocialButtons: false,
    showComments: false,
  },

  splitTests: [
    {
      id: 'example-project-v2',
      active: process.env.SPLITTEST_EXAMPLE_PROJECT_ACTIVE === 'true',
      variants: [
        {
          id: 'example-frog',
          rolloutPercent: parseInt(
            process.env
              .SPLITTEST_EXAMPLE_PROJECT_FROG_VARIANT_ROLLOUT_PERCENT || '0',
            10
          ),
        },
      ],
    },
    {
      id: 'subscription-page',
      active: process.env.SPLITTEST_SUBSCRIPTION_PAGE_ACTIVE === 'true',
      variants: [
        {
          id: 'new',
          rolloutPercent: parseInt(
            process.env
              .SPLITTEST_SUBSCRIPTION_PAGE_NEW_VARIANT_ROLLOUT_PERCENT || '0',
            10
          ),
        },
      ],
    },
    {
      id: 'pdf_caching_full',
      active: process.env.SPLIT_TEST_PDF_CACHING_FULL_ACTIVE === 'true',
      variants: [
        {
          id: 'collect-metrics-and-enable-caching',
          rolloutPercent: 5,
        },
        {
          id: 'enable-caching-only',
          rolloutPercent: 95,
        },
      ],
    },
  ],

  // cdn:
  // 	web:
  // 		host:"http://nowhere.sharelatex.dev"
  //		darkHost:"http://cdn.sharelatex.dev:3000"

  // Where your instance of ShareLaTeX can be found publically. Used in emails
  // that are sent out, generated links, etc.
  siteUrl: (siteUrl = process.env.PUBLIC_URL || 'http://localhost:3000'),

  lockManager: {
    lockTestInterval: intFromEnv('LOCK_MANAGER_LOCK_TEST_INTERVAL', 50),
    maxTestInterval: intFromEnv('LOCK_MANAGER_MAX_TEST_INTERVAL', 1000),
    maxLockWaitTime: intFromEnv('LOCK_MANAGER_MAX_LOCK_WAIT_TIME', 10000),
    redisLockExpiry: intFromEnv('LOCK_MANAGER_REDIS_LOCK_EXPIRY', 30),
    slowExecutionThreshold: intFromEnv(
      'LOCK_MANAGER_SLOW_EXECUTION_THRESHOLD',
      5000
    ),
  },

  // Optional separate location for websocket connections, if unset defaults to siteUrl.
  wsUrl: process.env.WEBSOCKET_URL,
  wsUrlV2: process.env.WEBSOCKET_URL_V2,
  wsUrlBeta: process.env.WEBSOCKET_URL_BETA,

  wsUrlV2Percentage: parseInt(
    process.env.WEBSOCKET_URL_V2_PERCENTAGE || '0',
    10
  ),
  wsRetryHandshake: parseInt(process.env.WEBSOCKET_RETRY_HANDSHAKE || '5', 10),

  // Compile UI rollout percentages
  logsUIPercentageBeta: parseInt(
    process.env.LOGS_UI_PERCENTAGE_BETA || '0',
    10
  ),
  logsUIPercentageWithoutPopupBeta: parseInt(
    process.env.LOGS_UI_WITHOUT_POPUP_PERCENTAGE_BETA || '0',
    10
  ),

  logsUIPercentage: parseInt(process.env.LOGS_UI_PERCENTAGE || '0', 10),
  logsUIPercentageWithoutPopup: parseInt(
    process.env.LOGS_UI_WITHOUT_POPUP_PERCENTAGE || '0',
    10
  ),

  // cookie domain
  // use full domain for cookies to only be accessible from that domain,
  // replace subdomain with dot to have them accessible on all subdomains
  cookieDomain: process.env.COOKIE_DOMAIN,
  cookieName: process.env.COOKIE_NAME || 'sharelatex.sid',

  // this is only used if cookies are used for clsi backend
  // clsiCookieKey: "clsiserver"

  // Same, but with http auth credentials.
  httpAuthSiteUrl: `http://${httpAuthUser}:${httpAuthPass}@${siteUrl}`,

  robotsNoindex: process.env.ROBOTS_NOINDEX === 'true' || false,

  maxEntitiesPerProject: 2000,

  maxUploadSize: 50 * 1024 * 1024, // 50 MB

  // start failing the health check if active handles exceeds this limit
  maxActiveHandles: process.env.MAX_ACTIVE_HANDLES
    ? parseInt(process.env.MAX_ACTIVE_HANDLES, 10)
    : undefined,

  // Security
  // --------
  security: {
    sessionSecret,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  }, // number of rounds used to hash user passwords (raised to power 2)

  httpAuthUsers,

  twoFactorAuthentication: {
    enabled: process.env.TWO_FACTOR_AUTHENTICATION_ENABLED === 'true',
    requiredForStaff:
      process.env.TWO_FACTOR_AUTHENTICATION_REQUIRED_FOR_STAFF === 'true',
  },

  jwt: {
    key: process.env.OT_JWT_AUTH_KEY,
    algorithm: process.env.OT_JWT_AUTH_ALG || 'HS256',
  },

  // Default features
  // ----------------
  //
  // You can select the features that are enabled by default for new
  // new users.
  defaultFeatures: (defaultFeatures = {
    collaborators: -1,
    dropbox: true,
    github: true,
    gitBridge: true,
    versioning: true,
    compileTimeout: 180,
    compileGroup: 'standard',
    references: true,
    templates: true,
    trackChanges: true,
  }),

  features: {
    personal: defaultFeatures,
  },

  plans: [
    {
      planCode: 'personal',
      name: 'Personal',
      price: 0,
      features: defaultFeatures,
    },
  ],

  enableSubscriptions: false,

  enabledLinkedFileTypes: (process.env.ENABLED_LINKED_FILE_TYPES || '').split(
    ','
  ),

  // i18n
  // ------
  //
  i18n: {
    checkForHTMLInVars: process.env.I18N_CHECK_FOR_HTML_IN_VARS === 'true',
    escapeHTMLInVars: process.env.I18N_ESCAPE_HTML_IN_VARS === 'true',
    subdomainLang: {
      www: { lngCode: 'en', url: siteUrl },
    },
    defaultLng: 'en',
  },

  // Spelling languages
  // ------------------
  //
  // You must have the corresponding aspell package installed to
  // be able to use a language.
  languages: [
    { code: 'en', name: 'English' },
    { code: 'en_US', name: 'English (American)' },
    { code: 'en_GB', name: 'English (British)' },
    { code: 'en_CA', name: 'English (Canadian)' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'ar', name: 'Arabic' },
    { code: 'gl', name: 'Galician' },
    { code: 'eu', name: 'Basque' },
    { code: 'br', name: 'Breton' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'ca', name: 'Catalan' },
    { code: 'hr', name: 'Croatian' },
    { code: 'cs', name: 'Czech' },
    { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'et', name: 'Estonian' },
    { code: 'fo', name: 'Faroese' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'el', name: 'Greek' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ga', name: 'Irish' },
    { code: 'it', name: 'Italian' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'ku', name: 'Kurdish' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'nr', name: 'Ndebele' },
    { code: 'ns', name: 'Northern Sotho' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fa', name: 'Persian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt_BR', name: 'Portuguese (Brazilian)' },
    { code: 'pt_PT', name: 'Portuguese (European)' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ro', name: 'Romanian' },
    { code: 'ru', name: 'Russian' },
    { code: 'sk', name: 'Slovak' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'st', name: 'Southern Sotho' },
    { code: 'es', name: 'Spanish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'ts', name: 'Tsonga' },
    { code: 'tn', name: 'Tswana' },
    { code: 'hsb', name: 'Upper Sorbian' },
    { code: 'cy', name: 'Welsh' },
    { code: 'xh', name: 'Xhosa' },
  ],

  // Password Settings
  // -----------
  // These restrict the passwords users can use when registering
  // opts are from http://antelle.github.io/passfield
  // passwordStrengthOptions:
  // 	pattern: "aA$3"
  // 	length:
  // 		min: 6
  // 		max: 128

  // Email support
  // -------------
  //
  //	ShareLaTeX uses nodemailer (http://www.nodemailer.com/) to send transactional emails.
  //	To see the range of transport and options they support, see http://www.nodemailer.com/docs/transports
  // email:
  //	fromAddress: ""
  //	replyTo: ""
  //	lifecycle: false
  // # Example transport and parameter settings for Amazon SES
  //	transport: "SES"
  //	parameters:
  //		AWSAccessKeyID: ""
  //		AWSSecretKey: ""

  // Third party services
  // --------------------
  //
  // ShareLaTeX's regular newsletter is managed by mailchimp. Add your
  // credentials here to integrate with this.
  // mailchimp:
  // 	api_key: ""
  // 	list_id: ""
  //
  // Fill in your unique token from various analytics services to enable
  // them.
  // analytics:
  // 	ga:
  // 		token: ""
  // 	gaOptimize:
  // 		id: ""
  // ShareLaTeX's help desk is provided by tenderapp.com
  // tenderUrl: ""
  //
  // Client-side error logging is provided by getsentry.com
  sentry: {
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.SENTRY_RELEASE,
  },
  //   publicDSN: ""
  // The publicDSN is the token for the client-side getSentry service.

  // Production Settings
  // -------------------
  debugPugTemplates: process.env.DEBUG_PUG_TEMPLATES === 'true',
  precompilePugTemplatesAtBootTime: process.env
    .PRECOMPILE_PUG_TEMPLATES_AT_BOOT_TIME
    ? process.env.PRECOMPILE_PUG_TEMPLATES_AT_BOOT_TIME === 'true'
    : process.env.NODE_ENV === 'production',

  // Should javascript assets be served minified or not. Note that you will
  // need to run `grunt compile:minify` within the web-sharelatex directory
  // to generate these.
  useMinifiedJs: process.env.MINIFIED_JS === 'true' || false,

  // Should static assets be sent with a header to tell the browser to cache
  // them.
  cacheStaticAssets: false,

  // If you are running ShareLaTeX over https, set this to true to send the
  // cookie with a secure flag (recommended).
  secureCookie: false,

  // 'SameSite' cookie setting. Can be set to 'lax', 'none' or 'strict'
  // 'lax' is recommended, as 'strict' will prevent people linking to projects
  // https://tools.ietf.org/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7
  sameSiteCookie: 'lax',

  // If you are running ShareLaTeX behind a proxy (like Apache, Nginx, etc)
  // then set this to true to allow it to correctly detect the forwarded IP
  // address and http/https protocol information.
  behindProxy: false,

  // Expose the hostname in the `X-Served-By` response header
  exposeHostname: process.env.EXPOSE_HOSTNAME === 'true',

  // Cookie max age (in milliseconds). Set to false for a browser session.
  cookieSessionLength: 5 * 24 * 60 * 60 * 1000, // 5 days

  // When true, only allow invites to be sent to email addresses that
  // already have user accounts
  restrictInvitesToExistingAccounts: false,

  // Should we allow access to any page without logging in? This includes
  // public projects, /learn, /templates, about pages, etc.
  allowPublicAccess: process.env.SHARELATEX_ALLOW_PUBLIC_ACCESS === 'true',

  enableHomepage: process.env.HOME_PAGE_ENABLED === 'true',

  // editor should be open by default
  editorIsOpen: process.env.EDITOR_OPEN !== 'false',

  // site should be open by default
  siteIsOpen: process.env.SITE_OPEN !== 'false',

  // Use a single compile directory for all users in a project
  // (otherwise each user has their own directory)
  // disablePerUserCompiles: true

  // Domain the client (pdfjs) should download the compiled pdf from
  pdfDownloadDomain: process.env.PDF_DOWNLOAD_DOMAIN, // "http://clsi-lb:3014"

  // By default turn on feature flag, can be overridden per request.
  enablePdfCaching: process.env.ENABLE_PDF_CACHING === 'true',

  // Whether to disable any existing service worker on the next load of the editor
  resetServiceWorker: process.env.RESET_SERVICE_WORKER === 'true',

  // Maximum size of text documents in the real-time editing system.
  max_doc_length: 2 * 1024 * 1024, // 2mb

  // Maximum JSON size in HTTP requests
  // We should be able to process twice the max doc length, to allow for
  //   - the doc content
  //   - text ranges spanning the whole doc
  //
  // There's also overhead required for the JSON encoding and the UTF-8 encoding,
  // theoretically up to 3 times the max doc length. On the other hand, we don't
  // want to block the event loop with JSON parsing, so we try to find a
  // practical compromise.
  max_json_request_size:
    parseInt(process.env.MAX_JSON_REQUEST_SIZE) || 6 * 1024 * 1024, // 6 MB

  // Internal configs
  // ----------------
  path: {
    // If we ever need to write something to disk (e.g. incoming requests
    // that need processing but may be too big for memory, then write
    // them to disk here).
    dumpFolder: './data/dumpFolder',
    uploadFolder: './data/uploads',
  },

  // Automatic Snapshots
  // -------------------
  automaticSnapshots: {
    // How long should we wait after the user last edited to
    // take a snapshot?
    waitTimeAfterLastEdit: 5 * minutes,
    // Even if edits are still taking place, this is maximum
    // time to wait before taking another snapshot.
    maxTimeBetweenSnapshots: 30 * minutes,
  },

  // Smoke test
  // ----------
  // Provide log in credentials and a project to be able to run
  // some basic smoke tests to check the core functionality.
  //
  smokeTest: {
    user: process.env.SMOKE_TEST_USER,
    userId: process.env.SMOKE_TEST_USER_ID,
    password: process.env.SMOKE_TEST_PASSWORD,
    projectId: process.env.SMOKE_TEST_PROJECT_ID,
    rateLimitSubject: process.env.SMOKE_TEST_RATE_LIMIT_SUBJECT || '127.0.0.1',
    stepTimeout: parseInt(process.env.SMOKE_TEST_STEP_TIMEOUT || '10000', 10),
  },

  appName: process.env.APP_NAME || 'ShareLaTeX (Community Edition)',

  adminEmail: process.env.ADMIN_EMAIL || 'placeholder@example.com',
  adminDomains: JSON.parse(process.env.ADMIN_DOMAINS || 'null'),

  salesEmail: process.env.SALES_EMAIL || 'placeholder@example.com',

  statusPageUrl: process.env.OVERLEAF_STATUS_URL || 'status.overleaf.com',

  nav: {
    title: 'ShareLaTeX Community Edition',

    left_footer: [
      {
        text:
          "Powered by <a href='https://www.sharelatex.com'>ShareLaTeX</a> © 2016",
      },
    ],

    right_footer: [
      {
        text: "<i class='fa fa-github-square'></i> Fork on Github!",
        url: 'https://github.com/sharelatex/sharelatex',
      },
    ],

    showSubscriptionLink: false,

    header_extras: [],
  },
  // Example:
  //   header_extras: [{text: "Some Page", url: "http://example.com/some/page", class: "subdued"}]

  recaptcha: {
    disabled: {
      invite: true,
      login: true,
      register: true,
    },
  },

  customisation: {},

  //	templates: [{
  //		name : "cv_or_resume",
  //		url : "/templates/cv"
  //	}, {
  //		name : "cover_letter",
  //		url : "/templates/cover-letters"
  //	}, {
  //		name : "journal_article",
  //		url : "/templates/journals"
  //	}, {
  //		name : "presentation",
  //		url : "/templates/presentations"
  //	}, {
  //		name : "thesis",
  //		url : "/templates/thesis"
  //	}, {
  //		name : "bibliographies",
  //		url : "/templates/bibliographies"
  //	}, {
  //		name : "view_all",
  //		url : "/templates"
  //	}]

  redirects: {
    '/templates/index': '/templates/',
  },

  reloadModuleViewsOnEachRequest: process.env.NODE_ENV === 'development',
  disableModule: {
    'user-activate': process.env.DISABLE_MODULE_USER_ACTIVATE === 'true',
    launchpad: process.env.DISABLE_MODULE_LAUNCHPAD === 'true',
  },

  domainLicences: [],

  sixpack: {
    domain: '',
  },
  // ShareLaTeX Server Pro options (https://www.sharelatex.com/university/onsite.html)
  // ----------

  // LDAP
  // ----------
  // Settings below use a working LDAP test server kindly provided by forumsys.com
  // When testing with forumsys.com use username = einstein and password = password

  // ldap :
  // 	host: 'ldap://ldap.forumsys.com'
  // 	dn: 'uid=:userKey,dc=example,dc=com'
  // 	baseSearch: 'dc=example,dc=com'
  // 	filter: "(uid=:userKey)"
  // 	failMessage: 'LDAP User Fail'
  // 	fieldName: 'LDAP User'
  // 	placeholder: 'email@example.com'
  // 	emailAtt: 'mail'
  // 	anonymous: false
  //	adminDN: 'cn=read-only-admin,dc=example,dc=com'
  //	adminPW: 'password'
  //	starttls: true
  //	tlsOptions:
  //		rejectUnauthorized: false
  //		ca: ['/etc/ldap/ca_certs.pem']

  // customTemplates: {
  //   "Template 1": {
  //     "path": "template1/",
  //     "templateFiles": ["main.tex", "header.tex"],
  //     "staticFiles": ["example.jpg"]
  //   }
  // },

  rateLimit: {
    autoCompile: {
      everyone: process.env.RATE_LIMIT_AUTO_COMPILE_EVERYONE || 100,
      standard: process.env.RATE_LIMIT_AUTO_COMPILE_STANDARD || 25,
    },
  },

  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
  },

  // currentImage: "texlive-full:2017.1"
  // imageRoot: "<DOCKER REPOSITORY ROOT>" # without any trailing slash

  compileBodySizeLimitMb: process.env.COMPILE_BODY_SIZE_LIMIT_MB || 5,

  textExtensions: defaultTextExtensions.concat(
    parseTextExtensions(process.env.ADDITIONAL_TEXT_EXTENSIONS)
  ),

  validRootDocExtensions: ['tex', 'Rtex', 'ltx'],

  emailConfirmationDisabled:
    process.env.EMAIL_CONFIRMATION_DISABLED === 'true' || false,

  // allowedImageNames: [
  // 	{imageName: 'texlive-full:2017.1', imageDesc: 'TeXLive 2017'}
  // 	{imageName:   'wl_texlive:2018.1', imageDesc: 'Legacy OL TeXLive 2015'}
  // 	{imageName: 'texlive-full:2016.1', imageDesc: 'Legacy SL TeXLive 2016'}
  // 	{imageName: 'texlive-full:2015.1', imageDesc: 'Legacy SL TeXLive 2015'}
  // 	{imageName: 'texlive-full:2014.2', imageDesc: 'Legacy SL TeXLive 2014.2'}
  // ]

  enabledServices: (process.env.ENABLED_SERVICES || 'web,api')
    .split(',')
    .map(s => s.trim()),

  // module options
  // ----------
  modules: {
    sanitize: {
      options: {
        allowedTags: [
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'p',
          'a',
          'ul',
          'ol',
          'nl',
          'li',
          'b',
          'i',
          'strong',
          'em',
          'strike',
          'code',
          'hr',
          'br',
          'div',
          'table',
          'thead',
          'col',
          'caption',
          'tbody',
          'tr',
          'th',
          'td',
          'tfoot',
          'pre',
          'iframe',
          'img',
          'figure',
          'figcaption',
          'span',
          'source',
          'video',
          'del',
        ],
        allowedAttributes: {
          a: [
            'href',
            'name',
            'target',
            'class',
            'event-tracking',
            'event-tracking-ga',
            'event-tracking-label',
            'event-tracking-trigger',
          ],
          div: ['class', 'id', 'style'],
          h1: ['class', 'id'],
          h2: ['class', 'id'],
          h3: ['class', 'id'],
          h4: ['class', 'id'],
          h5: ['class', 'id'],
          h6: ['class', 'id'],
          col: ['width'],
          figure: ['class', 'id', 'style'],
          figcaption: ['class', 'id', 'style'],
          i: ['aria-hidden', 'aria-label', 'class', 'id'],
          iframe: [
            'allowfullscreen',
            'frameborder',
            'height',
            'src',
            'style',
            'width',
          ],
          img: ['alt', 'class', 'src', 'style'],
          source: ['src', 'type'],
          span: ['class', 'id', 'style'],
          strong: ['style'],
          table: ['border', 'class', 'id', 'style'],
          td: ['colspan', 'rowspan', 'headers', 'style'],
          th: [
            'abbr',
            'headers',
            'colspan',
            'rowspan',
            'scope',
            'sorted',
            'style',
          ],
          tr: ['class'],
          video: ['alt', 'class', 'controls', 'height', 'width'],
        },
      },
    },
  },

  overleafModuleImports: {
    // modules to import (an empty array for each set of modules)
    createFileModes: [],
    gitBridge: [],
    publishModal: [],
    tprLinkedFileInfo: [],
    tprLinkedFileRefreshError: [],
  },

  csp: {
    percentage: parseFloat(process.env.CSP_PERCENTAGE) || 0,
    enabled: process.env.CSP_ENABLED === 'true',
    reportOnly: process.env.CSP_REPORT_ONLY === 'true',
    reportPercentage: parseFloat(process.env.CSP_REPORT_PERCENTAGE) || 0,
    reportUri: process.env.CSP_REPORT_URI,
    exclude: ['app/views/project/editor', 'app/views/project/list'],
  },

  unsupportedBrowsers: {
    ie: '<=11',
  },
}
