const translations = {
    en: {
        landing: {
            horusTitle: 'Horus',
            signIn: 'Sign In',
            getStarted: 'Get Started',
            liveBadge: 'Live Proctoring Active',
            mainHeadingPart1: 'Secure Assessments,',
            mainHeadingPart2: 'Uncompromised Integrity',
            horusMeans: 'Horus means that eye that sees everything',
            heroDesc: 'Advanced AI proctoring that preserves exam integrity while respecting student privacy. Ensuring fair testing environments everywhere.',
            startTrial: 'Start Free Trial',
            watchDemo: 'Watch Demo',
            stats: {
                accuracy: 'Detection Accuracy',
                secured: 'Exams Secured',
                institutions: 'Active Institutions',
                monitoring: 'AI Monitoring'
            },
            ecosystem: {
                titlePart1: 'An ecosystem built for',
                titlePart2: 'Trust & Precision',
                desc: 'We leverage advanced computer vision and machine learning models to analyze behavior and environment, leaving no room for academic dishonesty.',
                spatial: {
                    title: 'Spatial Vision Intelligence',
                    desc: 'Our proprietary models track gaze direction, micro-expressions, and spatial context to instantly flag suspicious behavior without false positives.'
                },
                lockdown: {
                    title: 'Browser Lockdown',
                    desc: 'Total restriction of external applications, unauthorized tabs, and shortcut bindings during sessions.'
                },
                analytics: {
                    title: 'Live Analytics',
                    desc: 'Comprehensive dashboards providing real-time sentiment analysis, attention metrics, and trust scores.'
                },
                interventions: {
                    title: 'Instant Interventions',
                    desc: 'Automated alerts trigger immediate reviewer notifications or system actions based on customizable confidence thresholds, ensuring minimal disruption while maintaining security.'
                }
            },
            cta: {
                protect: 'Protect Your Degrees.',
                empower: 'Empower Your Students.',
                desc: 'Deployment takes mere minutes. Integrate Horus directly into your existing IT infrastructure and LMS platforms effortlessly.',
                createAccount: 'Create Organization Account',
                contact: 'Contact Sales'
            },
            footer: {
                privacy: 'Privacy Policy',
                terms: 'Terms of Service',
                security: 'Security',
                rights: 'Horus Technology. All rights reserved.'
            }
        },
        auth: {
            login: {
                welcome: 'Welcome to Horas',
                studentAccess: 'Access your secure student portal',
                instructorAccess: 'Access your examiner dashboard',
                student: 'Student',
                instructor: 'Instructor',
                emailLabel: 'Email Address',
                studentEmailPlaceholder: 'student@university.edu',
                instructorEmailPlaceholder: 'instructor@university.edu',
                passwordLabel: 'Password',
                forgotPassword: 'Forgot password?',
                loginState: 'Log In',
                loading: 'Loading...',
                newToHoras: 'New to Horus?',
                createAccountLink: 'Create an account',
                newInstructor: 'New instructor?',
                createInstructorLink: 'Create an instructor account'
            },
            create: {
                passwordMismatch: 'Passwords do not match!',
                accountCreated: 'Account created for',
                joinTitle: 'Create Account',
                studentDesc: 'Create an account to access secure examinations',
                instructorDesc: 'Create your instructor account to manage exams',
                fullName: 'Full Name',
                fullNamePlaceholder: 'John Doe',
                studentId: 'Student ID',
                passwordConfirm: 'Confirm',
                createBtn: 'Create Account',
                alreadyHave: 'Already have an account?',
                loginHere: 'Login here'
            },
            instructor: {
                department: 'Department',
                departmentPlaceholder: 'e.g., Computer Science',
                institution: 'Institution',
                institutionPlaceholder: 'e.g., University Name'
            }
        },
        student: {
            dashboard: {
                portal: 'Student Portal',
                logout: 'Logout',
                welcomeBack: 'Welcome back,',
                upcomingExamsCount: 'You have {count} upcoming exams scheduled.',
                rulesTitle: 'Exam Rules & Requirements',
                cameraRuleTitle: 'Camera Must Be On',
                cameraRuleDesc: 'Continuous facial monitoring enabled.',
                tabRuleTitle: 'No Tab Switching',
                tabRuleDesc: 'Browser activity is strictly tracked.',
                timerRuleTitle: 'Timer Auto-Submission',
                timerRuleDesc: 'Automatically submits when time expires.',
                secureRuleTitle: 'Secure Environment',
                secureRuleDesc: 'No external electronic devices allowed.',
                nextExam: 'Next Exam',
                timeUntil: 'Time until',
                systemCheck: 'System Check',
                cameraPass: 'Camera Working',
                micPass: 'Microphone Working',
                browserPass: 'Browser Compatible',
                upcomingTitle: 'Upcoming Exams',
                scheduledBadge: 'Scheduled',
                minDuration: 'min',
                startExamBtn: 'Start Exam'
            },
            exam: {
                sessionActive: 'Exam Session Active',
                recordingBadge: 'Recording',
                timeRemaining: 'Time Remaining',
                progress: 'Progress',
                autoSaved: 'Auto-saved to cloud',
                multipleChoice: 'Multiple Choice',
                topicPrefix: 'Topic:',
                prevBtn: 'Previous',
                nextBtn: 'Next',
                submitBtn: 'Submit Exam',
                confirmSubmit: 'Are you sure you want to submit the exam?',
                proctoringFeed: 'Proctoring Feed',
                liveStatus: 'Live',
                initCamera: 'Initializing Camera...',
                cameraDisconnected: 'Camera Disconnected',
                navigator: 'Navigator',
                diagnostics: 'Diagnostics',
                cameraFeedCheck: 'Camera Feed',
                micCheck: 'Microphone',
                screenCheck: 'Screen Share',
                networkCheck: 'Network',
                networkStable: 'Stable',
                aiMonitorCheck: 'AI Monitor',
                activeStatus: 'Active',
                errorStatus: 'Error',
                unansweredQuestions: 'You have {count} unanswered questions. Are you sure you want to submit?'
            },
            submission: {
                title: 'Exam Submitted successfully!',
                message: 'Your exam has been safely transmitted and is now being analyzed by Horas proactively.',
                estScore: 'Estimated Score',
                feedbackExcellent: 'Excellent work! Outstanding performance.',
                feedbackGreat: 'Great job! Very solid understanding.',
                feedbackGood: 'Good effort!',
                feedbackPassed: 'Passed.',
                feedbackKeepPracticing: 'Keep practicing!',
                examLabel: 'Exam',
                timeLabel: 'Time',
                answeredLabel: 'Answered',
                dateLabel: 'Date',
                securityVerify: 'Horas Security Verification Continuous',
                securityVerifyDesc: 'The recorded session has been encrypted and signed. AI tracking data validates the exam environment securely.',
                returnDash: 'Return to Dashboard',
                reviewSub: 'Review Submission'
            }
        },
        examiner: {
            dashboard: {
                welcomeStr: 'Welcome,',
                welcomeDesc: 'Monitor and manage all exams',
                createExam: 'Create Exam',
                logout: 'Logout',
                nav: {
                    overview: 'Overview',
                    students: 'Students',
                    exams: 'Exams',
                    reports: 'Reports',
                    alerts: 'Alerts',
                    settings: 'Settings'
                },
                stats: {
                    totalStudents: 'Total Students',
                    activeEnrollment: 'Active Enrollment',
                    activeExams: 'Active Exams',
                    inProgress: 'In Progress',
                    aiAlerts: 'AI Alerts',
                    needsReview: 'Needs Review',
                    liveMonitor: 'Live Monitor',
                    proctoring: 'Proctoring',
                    viewSessions: 'View Sessions'
                },
                performance: {
                    title: 'Performance Analytics',
                    desc: 'Average scores over the last 10 weeks'
                },
                recentActivity: {
                    title: 'Recent Activity',
                    viewAll: 'View All Activity',
                    activities: {
                        suspicious: { title: 'Suspicious Behavior Flagged', desc: 'Exam: Advanced Physics', time: '10m ago' },
                        completed: { title: 'Exam Completed', desc: 'CS101 Midterm - 45 students', time: '1h ago' },
                        enrolled: { title: 'New Student Enrolled', desc: 'Alice Smith joined Data Structures', time: '3h ago' },
                        saved: { title: 'Exam Draft Saved', desc: 'Mathematics Final 2026', time: '5h ago' }
                    }
                }
            },
            alerts: {
                welcomeDesc: 'Monitor system alerts',
                stats: {
                    totalAlerts: 'Total Alerts',
                    critical: 'Critical',
                    new: 'New',
                    resolved: 'Resolved'
                },
                filters: {
                    all: 'All Alerts',
                    cheating: 'Cheating',
                    warning: 'Warnings',
                    system: 'System'
                },
                actions: {
                    view: 'View',
                    review: 'Review',
                    resolve: 'Resolve',
                    dismiss: 'Dismiss'
                },
                status: {
                    new: 'New',
                    reviewed: 'Reviewed',
                    resolved: 'Resolved'
                },
                empty: {
                    title: 'No alerts found',
                    desc: 'Everything is running smoothly.'
                }
            },
            exams: {
                welcomeDesc: 'Manage and schedule exams',
                stats: {
                    totalExams: 'Total Exams',
                    scheduled: 'Scheduled',
                    ongoing: 'Ongoing',
                    completed: 'Completed'
                },
                filters: {
                    all: 'All Exams',
                    scheduled: 'Scheduled',
                    ongoing: 'Ongoing',
                    completed: 'Completed'
                },
                status: {
                    scheduled: 'Scheduled',
                    ongoing: 'Ongoing',
                    completed: 'Completed'
                },
                card: {
                    date: 'Date',
                    duration: 'Duration',
                    min: 'min',
                    pts: 'pts',
                    viewDetails: 'View Details'
                },
                empty: {
                    title: 'No exams found',
                    desc: 'Try adjusting your filters to see more results.'
                }
            },
            settings: {
                welcomeDesc: 'Configure your preferences',
                nav: {
                    profile: 'Profile',
                    exam: 'Exam Settings',
                    proctoring: 'Proctoring',
                    notifications: 'Notifications',
                    security: 'Security'
                },
                profile: {
                    title: 'Profile Settings',
                    desc: 'Update your personal information and contact details.',
                    fullName: 'Full Name',
                    email: 'Email Address',
                    department: 'Department',
                    phone: 'Phone Number',
                    saveBtn: 'Save Changes'
                },
                exam: {
                    title: 'Exam Defaults',
                    desc: 'Configure global default settings for exams you create.',
                    duration: 'Default Duration (minutes)',
                    passing: 'Passing Percentage (%)',
                    lateSub: {
                        title: 'Allow Late Submission',
                        desc: 'Students can submit after time expires, flagged as late.'
                    },
                    autoGrade: {
                        title: 'Auto Grading',
                        desc: 'Automatically grade MCQ and True/False questions upon submission.'
                    },
                    saveBtn: 'Save Configurations'
                },
                proctoring: {
                    title: 'Proctoring AI Settings',
                    desc: 'Configure strictness and active monitoring capabilities.',
                    face: {
                        title: 'Face Detection AI',
                        desc: 'Monitor student face continuously during the exam.'
                    },
                    tab: {
                        title: 'Tab Switch Detection',
                        desc: 'Alert when a student switches tabs or exits full screen.'
                    },
                    audio: {
                        title: 'Audio Monitoring',
                        desc: 'Capture and analyze room audio for voices and suspicious noises.'
                    },
                    screen: {
                        title: 'Screen Recording',
                        desc: "Record the student's screen continuously for later review."
                    },
                    threshold: {
                        title: 'Suspicious Activity Threshold',
                        desc: 'Number of accumulated violations before automatically flagging the student as high-risk.'
                    },
                    saveBtn: 'Apply Proctoring Rules'
                },
                notification: {
                    title: 'Notification Preferences',
                    desc: 'Control when and how you receive alerts and reports.',
                    email: {
                        title: 'Email Alerts',
                        desc: 'Receive cheating alerts and summaries via email.'
                    },
                    push: {
                        title: 'Push Notifications',
                        desc: 'Show browser push notifications even when the tab is inactive.'
                    },
                    weekly: {
                        title: 'Weekly Reports',
                        desc: 'Receive a weekly summary report of all exams and activity.'
                    },
                    critical: {
                        title: 'Critical Alerts Only',
                        desc: 'Disable normal warnings and only notify for confirmed critical events.'
                    },
                    saveBtn: 'Save Preferences'
                },
                security: {
                    title: 'Security & Access',
                    desc: 'Manage your password and authentication methods.',
                    changePass: 'Change Password',
                    currentPass: 'Current Password',
                    newPass: 'New Password',
                    confirmPass: 'Confirm New Password',
                    updateBtn: 'Update Password',
                    twoFactor: {
                        title: 'Two-Factor Authentication',
                        desc: 'Add an extra layer of security to your account by requiring a code from your mobile device upon login.',
                        enableBtn: 'Enable 2FA'
                    }
                }
            },
            students: {
                welcomeDesc: 'Manage student records',
                liveMonitor: 'Live Monitor',
                stats: {
                    total: 'Total Students',
                    active: 'Active Students',
                    inactive: 'Inactive Students',
                    avgScore: 'Average Score'
                },
                searchPlaceholder: 'Search by name, email, or ID...',
                filters: {
                    all: 'All',
                    active: 'Active',
                    inactive: 'Inactive'
                },
                table: {
                    id: 'Student ID',
                    studentId: 'Student ID',
                    name: 'Name',
                    email: 'Email',
                    exams: 'Exams',
                    avgScore: 'Avg Score',
                    status: 'Status',
                    joinDate: 'Join Date',
                    actions: 'Actions'
                },
                status: {
                    active: 'Active',
                    inactive: 'Inactive'
                },
                empty: 'No students found matching your criteria.'
            },
            proctoring: {
                title: 'Horus Monitor',
                backBtn: 'Back to Dashboard',
                liveGrid: 'Live Classroom Grid',
                eventLogs: 'Live Event Logs',
                stats: {
                    activeExams: 'Active Exams',
                    totalStudents: 'Students Monitoring',
                    safe: 'Safe Status',
                    alerts: 'Active Alerts'
                },
                liveFeedTitle: 'Live Camera Feed',
                systemStatusTitle: 'System Status',
                resultsTitle: 'AI Analysis Results',
                waitingResponse: 'Waiting for API response...',
                rawJson: 'Raw JSON Response',
                howItWorksTitle: 'How it works',
                howItWorksDesc: 'This system captures video frames and audio chunks every 1 second and sends them to the Horus API for real-time analysis. The results are displayed instantly.',
                status: {
                    recording: 'Recording',
                    stopped: 'Stopped',
                    cameraInit: 'Camera Initializing...',
                    camera: 'Camera',
                    mic: 'Microphone',
                    api: 'API Status',
                    sending: 'Sending...',
                    ready: 'Ready',
                    active: 'Active',
                    failed: 'Failed',
                    initializing: 'Initializing...'
                },
                metrics: {
                    gaze: 'Gaze Off Screen',
                    phone: 'Phone Detected',
                    audio: 'Audio Suspicious',
                    risk: 'Risk Level',
                    yes: 'YES',
                    no: 'NO'
                }
            },
            examCreation: {
                title: 'Create New Exam',
                desc: 'Design your exam with multiple question types',
                backBtn: 'Back to Dashboard',
                detailsTitle: 'Exam Details',
                examTitle: 'Exam Title *',
                examTitlePlaceholder: 'e.g., Mathematics Final Exam 2025',
                description: 'Description',
                descPlaceholder: 'Brief description of the exam...',
                duration: 'Duration (min)',
                totalMarks: 'Total Marks',
                passingMarks: 'Passing Marks',
                upload: {
                    title: 'Upload Exam File (Optional)',
                    corsWarning: '⚠️ CORS Issue - See below',
                    corsNote: 'Note: The exam parser API currently has CORS restrictions. If file upload fails, please use the "Add Question" button below to manually create questions.',
                    parsing: 'Parsing exam file...',
                    extracting: 'Extracting questions from AI',
                    clickToUpload: 'Click to upload exam file',
                    formats: 'PDF, DOC, or DOCX • AI will auto-extract questions',
                    selectModel: 'Select Exam Model:',
                    model: 'Model',
                    modelsDesc: 'All models contain the same questions in different order',
                    manualNote: 'You can either upload an exam file OR create questions manually below',
                    fileUploaded: 'File uploaded:'
                },
                questions: {
                    title: 'Questions',
                    addBtn: 'Add Question',
                    empty: 'No questions added yet. Click "Add Question" to start.',
                    types: {
                        mcq: 'Multiple Choice',
                        essay: 'Essay',
                        truefalse: 'True/False'
                    },
                    essayNoteListItem: 'Open-ended question (Manual grading required)'
                },
                addForm: {
                    title: 'Add New Question',
                    type: 'Question Type',
                    questionText: 'Question *',
                    questionPlaceholder: 'Enter your question here...',
                    marks: 'Marks *',
                    options: 'Options',
                    optionPlaceholder: 'Option',
                    markCorrect: 'Click the circle to mark correct answer',
                    correctAnswer: 'Correct Answer',
                    trueBtn: 'True',
                    falseBtn: 'False',
                    essayNote: 'Note: Essay questions require manual grading by the examiner.',
                    cancelBtn: 'Cancel'
                },
                addQuestion: {
                    title: 'Add New Question',
                    type: 'Question Type',
                    questionText: 'Question *',
                    questionPlaceholder: 'Enter your question here...',
                    marks: 'Marks *',
                    options: 'Options',
                    optionPlaceholder: 'Option',
                    markCorrect: 'Click the circle to mark correct answer',
                    correctAnswer: 'Correct Answer',
                    trueBtn: 'True',
                    falseBtn: 'False',
                    essayNote: 'Note: Essay questions require manual grading by the examiner.',
                    cancelBtn: 'Cancel',
                    addBtn: 'Add Question'
                },
                summary: {
                    title: 'Exam Summary',
                    totalQ: 'Total Questions',
                    totalM: 'Total Marks',
                    createBtn: 'Create Exam'
                }
            },
            report: {
                welcome: 'Welcome, Dr. Ibrahim Mohamed',
                subtitle: 'Monitor and manage exam reports',
                createBtn: 'Create Exam',
                logoutBtn: 'Logout',
                tabs: {
                    overview: 'Overview',
                    students: 'Students',
                    exams: 'Exams',
                    reports: 'Reports',
                    alerts: 'Alerts',
                    settings: 'Settings'
                },
                loading: 'Loading Monitoring Activity...',
                connecting: 'Connecting to Horas Server',
                stats: {
                    total: 'Total Participants',
                    completed: 'Completed Exams',
                    ongoing: 'Ongoing Exams',
                    flagged: 'Flagged for Cheating'
                },
                table: {
                    title: 'Candidates Monitoring Log',
                    subtitle: 'Real-time status of student records.',
                    colName: 'Candidate Name',
                    colMoves: 'Suspicious Moves',
                    colWarnings: 'Warnings',
                    colFlagged: 'Flagged',
                    colDuration: 'Duration',
                    empty: 'No candidate records found.'
                },
                chart: {
                    title: 'Class Activity Trend'
                },
                filter: {
                    title: 'Data Filters',
                    all: 'Show All Records',
                    cheating: 'Cheating Detected',
                    desc: 'Reports are continuously synchronized with Horas proactive analytics engines. Use these filters to isolate potentially risky examination sessions.'
                }
            }
        }
    },
    ar: {

        auth: {
            login: {
                welcome: 'مرحبًا بك في حورس',
                studentAccess: 'الوصول لبوابة الطلاب',
                instructorAccess: 'الوصول لبوابة المعلمين',
                student: 'طالب',
                instructor: 'معلم',
                emailLabel: 'البريد الإلكتروني',
                studentEmailPlaceholder: 'طالب@الجامعة.edu',
                instructorEmailPlaceholder: 'معلم@الجامعة.edu',
                passwordLabel: 'كلمة المرور',
                forgotPassword: 'هل نسيت كلمة المرور؟',
                loginState: 'تسجيل دخول آمن',
                newToHoras: 'جديد في حورس؟',
                createAccountLink: 'إنشاء حساب',
                newInstructor: 'أنت معلم جديد؟',
                createInstructorLink: 'إنشاء حساب معلم'
            },
            create: {
                passwordMismatch: 'كلمة المرور غير متطابقة',
                accountCreated: 'تم إنشاء حساب لـ',
                joinTitle: 'إنشاء حساب',
                studentDesc: 'أنشئ حساباً للوصول إلى الامتحانات الآمنة',
                instructorDesc: 'أنشئ حساب معلم لإدارة الامتحانات',
                fullName: 'الاسم الكامل',
                fullNamePlaceholder: 'أحمد محمود',
                studentId: 'الرقم الجامعي',
                passwordConfirm: 'تأكيد كلمة المرور',
                createBtn: 'إنشاء حساب',
                alreadyHave: 'لديك حساب بالفعل؟',
                loginHere: 'سجل دخولك هنا'
            },
            instructor: {
                department: 'القسم',
                departmentPlaceholder: 'مثال: علوم الحاسوب',
                institution: 'المؤسسة التعليمية',
                institutionPlaceholder: 'مثال: جامعة ...'
            }
        },
        student: {
            dashboard: {
                portal: 'بوابة الطالب',
                logout: 'تسجيل الخروج',
                welcomeBack: 'مرحباً،',
                upcomingExamsCount: 'لديك {count} امتحانات قادمة هذا الأسبوع.',
                rulesTitle: 'قواعد ومتطلبات الامتحان',
                cameraRuleTitle: 'الكاميرا مطلوبة',
                cameraRuleDesc: 'يجب أن تكون الكاميرا قيد التشغيل طوال فترة الامتحان.',
                tabRuleTitle: 'تتبع علامات التبويب',
                tabRuleDesc: 'سيتم وضع علامة على التبديل بين النوافذ أو تصغير المتصفح.',
                timerRuleTitle: 'مؤقت صارم',
                timerRuleDesc: 'يتم تسليم الامتحان تلقائيًا عندما يصل المؤقت إلى الصفر.',
                secureRuleTitle: 'شبكة آمنة',
                secureRuleDesc: 'تأكد من استقرار الاتصال. يتم تسجيل الانقطاعات.',
                nextExam: 'الامتحان القادم',
                timeUntil: 'الوقت المتبقي لـ',
                systemCheck: 'فحص النظام',
                cameraPass: 'الكاميرا متصلة',
                micPass: 'الميكروفون نشط',
                browserPass: 'المتصفح مدعوم',
                upcomingTitle: 'الامتحانات القادمة',
                scheduledBadge: 'مجدول',
                minDuration: 'دقيقة',
                startExamBtn: 'بدء الامتحان'
            },
            exam: {
                sessionActive: 'جلسة المراقبة نشطة',
                recordingBadge: 'تسجيل',
                timeRemaining: 'الوقت المتبقي',
                progress: 'مستوى التقدم',
                autoSaved: 'تم الحفظ التلقائي منذ ثانيتين',
                multipleChoice: 'اختيار من متعدد',
                topicPrefix: 'الموضوع:',
                prevBtn: 'السابق',
                nextBtn: 'الصفحة التالية',
                confirmSubmit: 'هل أنت متأكد من تسليم الامتحان؟',
                submitBtn: 'تسليم الامتحان',
                proctoringFeed: 'بث المراقبة',
                liveStatus: 'بث حي',
                initCamera: 'جاري تشغيل الكاميرا...',
                cameraDisconnected: 'تم قطع اتصال الكاميرا',
                navigator: 'متصفح الامتحان',
                diagnostics: 'تشخيص النظام',
                cameraFeedCheck: 'بث الكاميرا',
                micCheck: 'الميكروفون',
                screenCheck: 'مراقبة الشاشة',
                networkCheck: 'استقرار الشبكة',
                aiMonitorCheck: 'حالة محرك الذكاء الاصطناعي',
                activeStatus: 'نشط',
                errorStatus: 'خطأ',
                unansweredQuestions: 'لديك {count} أسئلة لم تجب عليها. هل أنت متأكد من التسليم؟',
                networkStable: 'مستقر'
            },
            submission: {
                title: 'تم تسليم الامتحان بنجاح!',
                message: 'تم تسجيل إجاباتك بأمان وانتهت جلسة المراقبة بسلام.',
                estScore: 'الدرجة التقديرية',
                feedbackExcellent: 'عمل ممتاز!',
                feedbackGreat: 'أداء رائع!',
                feedbackGood: 'مجهود جيد.',
                feedbackPassed: 'لقد نجحت.',
                feedbackKeepPracticing: 'استمر في التدريب.',
                examLabel: 'الامتحان',
                timeLabel: 'وقت الانتهاء',
                answeredLabel: 'الأسئلة المجابة',
                dateLabel: 'التاريخ',
                securityVerify: 'اكتمل التحقق الأمني',
                securityVerifyDesc: 'تم إرسال جميع التحليلات الصوتية والمرئية والسلوكية بنجاح وتم التحقق منها بواسطة محرك حورس.',
                returnDash: 'العودة للرئيسية',
                reviewSub: 'مراجعة التسليم'
            }
        },
        landing: {
            horusTitle: 'حورس',
            signIn: 'تسجيل الدخول',
            getStarted: 'ابدأ الآن',
            liveBadge: 'حورس للذكاء الاصطناعي 2.0 متاح الآن',
            mainHeadingPart1: 'الأمان المطلق لـ',
            mainHeadingPart2: 'التعليم الحديث',
            horusMeans: '"حورس تعني العين التي ترى كل شيء"',
            heroDesc: 'أحدث ثورة في عملية الامتحانات باستخدام المراقبة بالذكاء الاصطناعي. تحليل السلوك، والمسح الذكي للبيئة، ونزاهة لا تقبل المساومة.',
            startTrial: 'ابدأ التجربة المجانية',
            watchDemo: 'شاهد العرض',
            stats: {
                accuracy: 'دقة الكشف',
                secured: 'امتحانات مؤمنة',
                institutions: 'مؤسسات نشطة',
                monitoring: 'مراقبة الذكاء الاصطناعي'
            },
            ecosystem: {
                titlePart1: 'نظام بيئي مبني من أجل',
                titlePart2: 'الثقة والدقة',
                desc: 'نحن نستفيد من الرؤية الحاسوبية المتقدمة ونماذج التعلم الآلي لتحليل السلوك والبيئة، ولا نترك أي مجال لعدم النزاهة الأكاديمية.',
                spatial: {
                    title: 'ذكاء الرؤية المكانية',
                    desc: 'تتتبع نماذجنا الخاصة اتجاه النظرة والتعبيرات الدقيقة والسياق المكاني للإبلاغ الفوري عن أي سلوك مشبوه بدون أخطاء.'
                },
                lockdown: {
                    title: 'إغلاق المتصفح',
                    desc: 'حظر كامل للتطبيقات الخارجية وعلامات التبويب غير المصرح بها واختصارات لوحة المفاتيح أثناء الجلسات.'
                },
                analytics: {
                    title: 'تحليلات مباشرة',
                    desc: 'لوحات تحكم شاملة توفر تحليلًا فوريًا للمشاعر ومقاييس الانتباه ودرجات الثقة.'
                },
                interventions: {
                    title: 'تدخلات فورية',
                    desc: 'تعمل التنبيهات الآلية على إطلاق إشعارات فورية للمراجعين أو إجراءات النظام بناءً على مستويات ثقة قابلة للتخصيص، لضمان الحد الأدنى من التعطيل مع الحفاظ على الأمان.'
                }
            },
            cta: {
                protect: 'احمِ درجاتك.',
                empower: 'مكّن طلابك.',
                desc: 'يستغرق النشر بضع دقائق فقط. قم بدمج حورس مباشرة في البنية التحتية لتقنية المعلومات لديك ومنصات إدارة التعلم دون جهد.',
                createAccount: 'إنشاء حساب مؤسسة',
                contact: 'تواصل مع المبيعات'
            },
            footer: {
                privacy: 'سياسة الخصوصية',
                terms: 'شروط الخدمة',
                security: 'الأمان',
                rights: 'تكنولوجيا حورس. جميع الحقوق محفوظة.'
            }
        },
        examiner: {
            dashboard: {
                welcomeStr: 'مرحباً،',
                welcomeDesc: 'مراقبة وإدارة جميع الامتحانات',
                createExam: 'إنشاء امتحان',
                logout: 'تسجيل الخروج',
                nav: {
                    overview: 'نظرة عامة',
                    students: 'الطلاب',
                    exams: 'الامتحانات',
                    reports: 'التقارير',
                    alerts: 'التنبيهات',
                    settings: 'الإعدادات'
                },
                stats: {
                    totalStudents: 'إجمالي الطلاب',
                    activeEnrollment: 'التسجيل النشط',
                    activeExams: 'الامتحانات النشطة',
                    inProgress: 'قيد التقدم',
                    aiAlerts: 'تنبيهات الذكاء الاصطناعي',
                    needsReview: 'يحتاج إلى مراجعة',
                    liveMonitor: 'المراقبة المباشرة',
                    proctoring: 'المراقبة',
                    viewSessions: 'عرض الجلسات'
                },
                performance: {
                    title: 'تحليلات الأداء',
                    desc: 'متوسط الدرجات خلال 10 أسابيع الماضية'
                },
                recentActivity: {
                    title: 'النشاط الأخير',
                    viewAll: 'عرض جميع الأنشطة',
                    activities: {
                        suspicious: { title: 'تم الإبلاغ عن سلوك مشبوه', desc: 'الامتحان: فيزياء متقدمة', time: 'قبل 10 دقائق' },
                        completed: { title: 'اكتمل الامتحان', desc: 'امتحان منتصف الفصل CS101 - 45 طالباً', time: 'قبل ساعة' },
                        enrolled: { title: 'تم تسجيل طالب جديد', desc: 'انضمت أليس سميث إلى هياكل البيانات', time: 'قبل 3 ساعات' },
                        saved: { title: 'تم حفظ مسودة الامتحان', desc: 'نهائي الرياضيات 2026', time: 'قبل 5 ساعات' }
                    }
                }
            },
            alerts: {
                welcomeDesc: 'مراقبة تنبيهات النظام',
                stats: {
                    totalAlerts: 'إجمالي التنبيهات',
                    critical: 'حرج',
                    new: 'جديد',
                    resolved: 'محلول'
                },
                filters: {
                    all: 'جميع التنبيهات',
                    cheating: 'غش',
                    warning: 'تحذيرات',
                    system: 'نظام'
                },
                actions: {
                    view: 'عرض',
                    review: 'مراجعة',
                    resolve: 'حل',
                    dismiss: 'تجاهل'
                },
                status: {
                    new: 'جديد',
                    reviewed: 'تمت المراجعة',
                    resolved: 'محلول'
                },
                empty: {
                    title: 'لم يتم العثور على تنبيهات',
                    desc: 'كل شيء يعمل بسلاسة.'
                }
            },
            exams: {
                welcomeDesc: 'إدارة وجدولة الامتحانات',
                stats: {
                    totalExams: 'إجمالي الامتحانات',
                    scheduled: 'مجدول',
                    ongoing: 'جاري',
                    completed: 'مكتمل'
                },
                filters: {
                    all: 'جميع الامتحانات',
                    scheduled: 'مجدول',
                    ongoing: 'جاري',
                    completed: 'مكتمل'
                },
                status: {
                    scheduled: 'مجدول',
                    ongoing: 'جاري',
                    completed: 'مكتمل'
                },
                card: {
                    date: 'التاريخ',
                    duration: 'المدة',
                    min: 'دقائق',
                    pts: 'نقطة',
                    viewDetails: 'عرض التفاصيل'
                },
                empty: {
                    title: 'لم يتم العثور على امتحانات',
                    desc: 'حاول تعديل التصفية لرؤية المزيد من النتائج.'
                }
            },
            settings: {
                welcomeDesc: 'تكوين تفضيلاتك',
                nav: {
                    profile: 'الملف الشخصي',
                    exam: 'إعدادات الامتحان',
                    proctoring: 'المراقبة',
                    notifications: 'الإشعارات',
                    security: 'الأمان'
                },
                profile: {
                    title: 'إعدادات الملف الشخصي',
                    desc: 'تحديث معلوماتك الشخصية وتفاصيل الاتصال.',
                    fullName: 'الاسم الكامل',
                    email: 'عنوان البريد الإلكتروني',
                    department: 'القسم',
                    phone: 'رقم الهاتف',
                    saveBtn: 'حفظ التغييرات'
                },
                exam: {
                    title: 'الافتراضيات للامتحان',
                    desc: 'تكوين الإعدادات الافتراضية العامة للامتحانات التي تنشئها.',
                    duration: 'المدة الافتراضية (بالدقائق)',
                    passing: 'نسبة النجاح (%)',
                    lateSub: {
                        title: 'السماح بالتقديم المتأخر',
                        desc: 'يمكن للطلاب التقديم بعد انتهاء الوقت، وسيتم وضع علامة متأخر.'
                    },
                    autoGrade: {
                        title: 'التصحيح التلقائي',
                        desc: 'تصحيح أسئلة الاختيار من متعدد والصح/الخطأ تلقائياً عند التقديم.'
                    },
                    saveBtn: 'حفظ التكوينات'
                },
                proctoring: {
                    title: 'إعدادات المراقبة بالذكاء الاصطناعي',
                    desc: 'تكوين الصرامة وقدرات المراقبة النشطة.',
                    face: {
                        title: 'الذكاء الاصطناعي لاكتشاف الوجه',
                        desc: 'مراقبة وجه الطالب باستمرار أثناء الامتحان.'
                    },
                    tab: {
                        title: 'اكتشاف تبديل التبويبات',
                        desc: 'تنبيه عند قيام الطالب بتبديل التبويبات أو الخروج من وضع ملء الشاشة.'
                    },
                    audio: {
                        title: 'مراقبة الصوت',
                        desc: 'التقاط وتحليل صوت الغرفة بحثاً عن أصوات وضوضاء مشبوهة.'
                    },
                    screen: {
                        title: 'تسجيل الشاشة',
                        desc: 'تسجيل شاشة الطالب باستمرار للمراجعة اللاحقة.'
                    },
                    threshold: {
                        title: 'حد النشاط المشبوه',
                        desc: 'عدد الانتهاكات المتراكمة قبل تصنيف الطالب تلقائياً كعالي المخاطر.'
                    },
                    saveBtn: 'تطبيق قواعد المراقبة'
                },
                notification: {
                    title: 'تفضيلات الإشعارات',
                    desc: 'التحكم في متى وكيف تتلقى التنبيهات والتقارير.',
                    email: {
                        title: 'تنبيهات البريد الإلكتروني',
                        desc: 'تلقي تنبيهات الغش والملخصات عبر البريد الإلكتروني.'
                    },
                    push: {
                        title: 'الإشعارات الفورية',
                        desc: 'إظهار الإشعارات الفورية للمتصفح حتى عندما تكون علامة التبويب غير نشطة.'
                    },
                    weekly: {
                        title: 'تقارير أسبوعية',
                        desc: 'تلقي تقرير ملخص أسبوعي لجميع الامتحانات والأنشطة.'
                    },
                    critical: {
                        title: 'التنبيهات الحرجة فقط',
                        desc: 'تعطيل التحذيرات العادية والإبلاغ فقط عن الأحداث الحرجة المؤكدة.'
                    },
                    saveBtn: 'حفظ التفضيلات'
                },
                security: {
                    title: 'الأمان والوصول',
                    desc: 'إدارة كلمة المرور وطرق المصادقة الخاصة بك.',
                    changePass: 'تغيير كلمة المرور',
                    currentPass: 'كلمة المرور الحالية',
                    newPass: 'كلمة المرور الجديدة',
                    confirmPass: 'تأكيد كلمة المرور الجديدة',
                    updateBtn: 'تحديث كلمة المرور',
                    twoFactor: {
                        title: 'المصادقة الثنائية',
                        desc: 'أضف طبقة أمان إضافية إلى حسابك عن طريق طلب رمز من جهازك المحمول عند تسجيل الدخول.',
                        enableBtn: 'تفعيل المصادقة الثنائية'
                    }
                }
            },
            students: {
                welcomeDesc: 'إدارة سجلات الطلاب',
                liveMonitor: 'المراقبة المباشرة',
                stats: {
                    total: 'إجمالي الطلاب',
                    active: 'الطلاب النشطون',
                    inactive: 'الطلاب غير النشطين',
                    avgScore: 'متوسط الدرجات'
                },
                searchPlaceholder: 'البحث بالاسم أو البريد الإلكتروني أو المعرف...',
                filters: {
                    all: 'الكل',
                    active: 'نشط',
                    inactive: 'غير نشط'
                },
                table: {
                    id: 'معرف الطالب',
                    studentId: 'معرف الطالب',
                    name: 'الاسم',
                    email: 'البريد الإلكتروني',
                    exams: 'الامتحانات',
                    avgScore: 'متوسط الدرجات',
                    status: 'الحالة',
                    joinDate: 'تاريخ الانضمام',
                    actions: 'الإجراءات'
                },
                status: {
                    active: 'نشط',
                    inactive: 'غير نشط'
                },
                empty: 'لم يتم العثور على طلاب يطابقون معاييرك.'
            },
            proctoring: {
                title: 'مراقب حورس',
                backBtn: 'العودة إلى لوحة القيادة',
                liveGrid: 'شبكة الفصول المباشرة',
                eventLogs: 'سجل الأحداث المباشر',
                stats: {
                    activeExams: 'الامتحانات النشطة',
                    totalStudents: 'الطلاب قيد المراقبة',
                    safe: 'الحالة الآمنة',
                    alerts: 'تنبيهات نشطة'
                },
                liveFeedTitle: 'بث الكاميرا المباشر',
                systemStatusTitle: 'حالة النظام',
                resultsTitle: 'نتائج تحليل الذكاء الاصطناعي',
                waitingResponse: 'في انتظار استجابة واجهة برمجة التطبيقات...',
                rawJson: 'استجابة JSON الخام',
                howItWorksTitle: 'كيف يعمل',
                howItWorksDesc: 'يقوم هذا النظام بالتقاط إطارات الفيديو ومقاطع الصوت كل ثانية وإرسالها إلى واجهة برمجة تطبيقات حورس للتحليل الفوري. يتم عرض النتائج فوراً.',
                status: {
                    recording: 'تسجيل',
                    stopped: 'متوقف',
                    cameraInit: 'جاري تهيئة الكاميرا...',
                    camera: 'الكاميرا',
                    mic: 'الميكروفون',
                    api: 'حالة API',
                    sending: 'جاري الإرسال...',
                    ready: 'جاهز',
                    active: 'نشط',
                    failed: 'فشل',
                    initializing: 'جاري التهيئة...'
                },
                metrics: {
                    gaze: 'النظر خارج الشاشة',
                    phone: 'تم اكتشاف هاتف',
                    audio: 'صوت مشبوه',
                    risk: 'مستوى الخطر',
                    yes: 'نعم',
                    no: 'لا'
                }
            },
            examCreation: {
                title: 'إنشاء امتحان جديد',
                desc: 'قم بتصميم امتحانك بأنواع أسئلة متعددة',
                backBtn: 'العودة إلى لوحة القيادة',
                detailsTitle: 'تفاصيل الامتحان',
                examTitle: 'عنوان الامتحان *',
                examTitlePlaceholder: 'مثل: الاختبار النهائي للرياضيات 2025',
                description: 'الوصف',
                descPlaceholder: 'وصف موجز للامتحان...',
                duration: 'المدة (بالدقائق)',
                totalMarks: 'إجمالي الدرجات',
                passingMarks: 'درجة النجاح',
                upload: {
                    title: 'تحميل ملف الامتحان (اختياري)',
                    corsWarning: '⚠️ مشكلة CORS - انظر أدناه',
                    corsNote: 'ملاحظة: واجهة برمجة تطبيقات محلل الامتحانات تواجه حالياً قيود CORS. إذا فشل تحميل الملف، يرجى استخدام زر "إضافة سؤال" أدناه لإنشاء الأسئلة يدوياً.',
                    parsing: 'جاري تحليل ملف الامتحان...',
                    extracting: 'جاري استخراج الأسئلة من الذكاء الاصطناعي',
                    clickToUpload: 'انقر لتحميل ملف الامتحان',
                    formats: 'PDF أو DOC أو DOCX • سيستخرج الذكاء الاصطناعي الأسئلة تلقائياً',
                    selectModel: 'اختر نموذج الامتحان:',
                    model: 'نموذج',
                    modelsDesc: 'جميع النماذج تحتوي على نفس الأسئلة بترتيب مختلف',
                    manualNote: 'يمكنك إما تحميل ملف امتحان أو إنشاء أسئلة يدوياً أدناه',
                    fileUploaded: 'تم تحميل الملف:'
                },
                questions: {
                    title: 'الأسئلة',
                    addBtn: 'إضافة سؤال',
                    empty: 'لم تتم إضافة أي أسئلة بعد. انقر على "إضافة سؤال" للبدء.',
                    types: {
                        mcq: 'اختيار من متعدد',
                        essay: 'مقال',
                        truefalse: 'صح/خطأ'
                    },
                    essayNoteListItem: 'سؤال مفتوح الإجابة (يتطلب تصحيحاً يدوياً)'
                },
                addForm: {
                    title: 'إضافة سؤال جديد',
                    type: 'نوع السؤال',
                    questionText: 'السؤال *',
                    questionPlaceholder: 'أدخل سؤالك هنا...',
                    marks: 'الدرجات *',
                    options: 'الخيارات',
                    optionPlaceholder: 'الخيار',
                    markCorrect: 'انقر على الدائرة لتحديد الإجابة الصحيحة',
                    correctAnswer: 'الإجابة الصحيحة',
                    trueBtn: 'صح',
                    falseBtn: 'خطأ',
                    essayNote: 'ملاحظة: تتطلب الأسئلة المقالية تصحيحاً يدوياً من قبل الممتحن.',
                    cancelBtn: 'إلغاء'
                },
                addQuestion: {
                    title: 'إضافة سؤال جديد',
                    type: 'نوع السؤال',
                    questionText: 'السؤال *',
                    questionPlaceholder: 'أدخل سؤالك هنا...',
                    marks: 'الدرجات *',
                    options: 'الخيارات',
                    optionPlaceholder: 'الخيار',
                    markCorrect: 'انقر على الدائرة لتحديد الإجابة الصحيحة',
                    correctAnswer: 'الإجابة الصحيحة',
                    trueBtn: 'صح',
                    falseBtn: 'خطأ',
                    essayNote: 'ملاحظة: تتطلب الأسئلة المقالية تصحيحاً يدوياً من قبل الممتحن.',
                    cancelBtn: 'إلغاء',
                    addBtn: 'إضافة سؤال'
                },
                summary: {
                    title: 'ملخص الامتحان',
                    totalQ: 'إجمالي الأسئلة',
                    totalM: 'إجمالي الدرجات',
                    createBtn: 'إنشاء امتحان'
                }
            },
            report: {
                welcome: 'مرحباً د. إبراهيم محمد',
                subtitle: 'مراقبة وإدارة تقارير الامتحانات',
                createBtn: 'إنشاء امتحان',
                logoutBtn: 'تسجيل الخروج',
                tabs: {
                    overview: 'نظرة عامة',
                    students: 'الطلاب',
                    exams: 'الامتحانات',
                    reports: 'التقارير',
                    alerts: 'التنبيهات',
                    settings: 'الإعدادات'
                },
                loading: 'جاري تحميل نشاط المراقبة...',
                connecting: 'الاتصال بخادم حورس',
                stats: {
                    total: 'إجمالي المشاركين',
                    completed: 'امتحانات مكتملة',
                    ongoing: 'امتحانات جارية',
                    flagged: 'تم الإبلاغ عن غش'
                },
                table: {
                    title: 'سجل مراقبة المرشحين',
                    subtitle: 'حالة سجلات الطلاب في الوقت الفعلي.',
                    colName: 'اسم المرشح',
                    colMoves: 'حركات مشبوهة',
                    colWarnings: 'تحذيرات',
                    colFlagged: 'تم الإبلاغ',
                    colDuration: 'المدة',
                    empty: 'لم يتم العثور على سجلات مرشحين.'
                },
                chart: {
                    title: 'اتجاه نشاط الفصل'
                },
                filter: {
                    title: 'عوامل تصفية البيانات',
                    all: 'إظهار جميع السجلات',
                    cheating: 'تم اكتشاف غش',
                    desc: 'تتم مزامنة التقارير باستمرار مع محركات حورس التحليلية الاستباقية. استخدم عوامل التصفية هذه لعزل جلسات الفحص التي يحتمل أن تكون محفوفة بالمخاطر.'
                }
            }
        }
    }
};

export default translations;
