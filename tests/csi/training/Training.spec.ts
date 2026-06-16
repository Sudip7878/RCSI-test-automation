import { expect, test } from '../../../fixtures/csi/testSetup';
import {
  csiAdminTestEmail,
  csiAdminTestPassword,
  csiAutoEnrollOrgUserTestEmail,
  csiAutoEnrollOrgUserTestPassword,
  csiOrgTestEmail,
  csiOrgTestPassword,
  csiOrgUserTestEmail,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassingUserTestEmail,
  csiTestPassingUserTestPassword,
  csiTestPassword,
  csiTpTrainingAdminTestEmail,
  csiTpTrainingAdminTestPassword,
  csiUserTestEmail,
  csiUserTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiTr017MissedCourseOne,
  csiTr017MissedCourseTwo,
  csiTr017MissedDistributionName,
  csiTr029CourseBgImagePath,
  csiTr029VideoUrl,
  csiTrainingFailRetakeCourseName,
  csiUniqueCourseCode,
  csiUniqueCourseTitle,
  csiUniqueDistributionName,
} from '../../../utils/csi/trainingTestData';

test.describe('CSI · Training', () => {
  test.describe.configure({ timeout: 180_000 });

  /**
   * TR-001: Training Admin creates a course distribution from Course Distribution
   * (recorded-steps/Training/TR-001.txt).
   */
  test.describe('TR-001 training admin creates distribution', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTpTrainingAdminTestEmail(),
        csiTpTrainingAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-001', async ({ csiTrainingPage }) => {
      const loginEmail = csiTpTrainingAdminTestEmail();
      const distributionName = csiUniqueDistributionName();

      const myCourseTitles = await csiTrainingPage.openMyCourseAndCollectRegisteredCourseTitles();
      const excludedForFirst = new Set(myCourseTitles);

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);

      const firstSelectedCourse = await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(
        excludedForFirst,
        0,
      );
      const excludedForSecond = new Set([...myCourseTitles, firstSelectedCourse]);
      await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(excludedForSecond, 1);
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.pickTodayDistributionStartDate();
      await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, loginEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

  /**
   * TR-002: System Owner creates a course distribution — identical flow to TR-001
   * but logged in as CSI_SYSTEM_OWNER_TEST_EMAIL (recorded-steps/Training/TR-002.txt).
   */
  test.describe('TR-002 system owner creates distribution', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-002', async ({ csiTrainingPage }) => {
      const loginEmail = csiSystemOwnerTestEmail();
      const distributionName = csiUniqueDistributionName();

      const myCourseTitles = await csiTrainingPage.openMyCourseAndCollectRegisteredCourseTitles();
      const excludedForFirst = new Set(myCourseTitles);

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);

      const firstSelectedCourse = await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(
        excludedForFirst,
        0,
      );
      const excludedForSecond = new Set([...myCourseTitles, firstSelectedCourse]);
      await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(excludedForSecond, 1);
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.pickTodayDistributionStartDate();
      await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, loginEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

  /**
   * TR-003: Admin creates a course distribution — identical flow to TR-001
   * but logged in as CSI_ADMIN_TEST_EMAIL (recorded-steps/Training/TR-003.txt).
   */
  test.describe('TR-003 admin creates distribution', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_ADMIN_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiAdminTestEmail(), csiAdminTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-003', async ({ csiTrainingPage }) => {
      const loginEmail = csiAdminTestEmail();
      const distributionName = csiUniqueDistributionName();

      const myCourseTitles = await csiTrainingPage.openMyCourseAndCollectRegisteredCourseTitles();
      const excludedForFirst = new Set(myCourseTitles);

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);

      const firstSelectedCourse = await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(
        excludedForFirst,
        0,
      );
      const excludedForSecond = new Set([...myCourseTitles, firstSelectedCourse]);
      await csiTrainingPage.selectFirstVisibleCourseOptionNotIn(excludedForSecond, 1);
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.pickTodayDistributionStartDate();
      await csiTrainingPage.searchUsersAndSelectRowByEmail(loginEmail, loginEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      await csiTrainingPage.openDistributionView();
      await csiTrainingPage.expectDistributionListed(distributionName);
    });
  });

  /**
   * TR-004: Super Admin creates a course distribution in any org — same flow as TR-001 but
   * logged in as CSI_TEST_EMAIL (super admin) and the distribution target user is
   * CSI_ORG_USER_TEST_EMAIL instead of the logged-in account
   * (recorded-steps/Training/TR-004.txt).
   */
  test.describe('TR-004 super admin creates distribution in any org', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-004', async ({ csiTrainingPage }) => {
      const targetEmail = csiOrgUserTestEmail();
      const distributionName = csiUniqueDistributionName();

      const myCourseTitles = await csiTrainingPage.openMyCourseAndCollectRegisteredCourseTitles();
      const excludedForFirst = new Set(myCourseTitles);

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);

      const firstSelectedCourse = await csiTrainingPage.selectFirstVisibleCourseOptionNotInStrict(
        excludedForFirst,
        0,
      );
      const excludedForSecond = new Set([...myCourseTitles, firstSelectedCourse]);
      await csiTrainingPage.selectFirstVisibleCourseOptionNotInStrict(excludedForSecond, 1);
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.pickTodayDistributionStartDate();
      // Search and select the org user (not the super admin) as the distribution target
      await csiTrainingPage.searchUsersAndSelectRowByEmail(targetEmail, targetEmail);
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();
      // Redirection to /CourseDistribution (already asserted inside submitDistribute) is sufficient
    });
  });

  /**
   * TR-029: Super Admin creates a new course — fills course code, pass score, category,
   * title, description, uploads cover image, then publishes and verifies the course
   * is listed in the course library (recorded-steps/Training/TR-029.txt).
   */
  test.describe('TR-029 super admin creates course', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-029', async ({ csiTrainingPage }) => {
      const courseTitle = csiUniqueCourseTitle();
      const courseCode = csiUniqueCourseCode();

      await csiTrainingPage.navigateToCourseEdit();
      await csiTrainingPage.fillCourseCode(courseCode);
      await csiTrainingPage.fillCoursePassScore('80');
      await csiTrainingPage.selectCourseFirstCategory();
      await csiTrainingPage.fillCourseTitleInLanguageSection(courseTitle);
      await csiTrainingPage.fillCourseDescriptionInLanguageSection('Test Desc');

      // Add a Quiz lesson inside Language 1 before submitting the form (Version 2 steps)
      await csiTrainingPage.addLessonAndSelectQuizType();
      await csiTrainingPage.fillLessonName(`Lesson_${courseCode}`);
      await csiTrainingPage.fillQuizDetails(`Quiz_${courseCode}`, '2', '100');
      await csiTrainingPage.fillQuizFirstQuestion('Question Test', '100');
      await csiTrainingPage.fillQuizAnswers('Correct', 'Incorrect');
      await csiTrainingPage.addVideoLesson(
        `Video_${courseCode}`,
        '2',
        csiTr029VideoUrl(),
        'Desc',
      );
      await csiTrainingPage.finishQuizLesson();

      await csiTrainingPage.uploadCourseCoverImage(csiTr029CourseBgImagePath);
      await csiTrainingPage.submitCourseFormNextStep();
      await csiTrainingPage.publishCourse();
      await csiTrainingPage.searchCourseAndExpectTitleVisible(courseTitle);
    });
  });

  /**
   * TR-032: Super Admin edits a course — runs the full TR-029 creation flow first, then
   * opens the created course card's "More Actions → Edit", updates the course title and
   * quiz title, re-publishes, and verifies the updated title in the course library
   * (recorded-steps/Training/TR-032.txt).
   */
  test.describe('TR-032 super admin edits course', () => {
    test.describe.configure({ timeout: 360_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-032', async ({ csiTrainingPage }) => {
      const courseCode = csiUniqueCourseCode();
      const courseTitle = csiUniqueCourseTitle();

      // Phase 1: create a course using the full TR-029 flow
      await csiTrainingPage.navigateToCourseEdit();
      await csiTrainingPage.fillCourseCode(courseCode);
      await csiTrainingPage.fillCoursePassScore('80');
      await csiTrainingPage.selectCourseFirstCategory();
      await csiTrainingPage.fillCourseTitleInLanguageSection(courseTitle);
      await csiTrainingPage.fillCourseDescriptionInLanguageSection('Test Desc');

      await csiTrainingPage.addLessonAndSelectQuizType();
      await csiTrainingPage.fillLessonName(`Lesson_${courseCode}`);
      await csiTrainingPage.fillQuizDetails(`Quiz_${courseCode}`, '2', '100');
      await csiTrainingPage.fillQuizFirstQuestion('Question Test', '100');
      await csiTrainingPage.fillQuizAnswers('Correct', 'Incorrect');
      await csiTrainingPage.addVideoLesson(
        `Video_${courseCode}`,
        '2',
        csiTr029VideoUrl(),
        'Desc',
      );
      await csiTrainingPage.finishQuizLesson();

      await csiTrainingPage.uploadCourseCoverImage(csiTr029CourseBgImagePath);
      await csiTrainingPage.submitCourseFormNextStep();
      await csiTrainingPage.publishCourse();
      await csiTrainingPage.searchCourseAndExpectTitleVisible(courseTitle);

      // Phase 2: edit the course — update course title and quiz title, then re-publish
      const editedCourseTitle = csiUniqueCourseTitle('EditedCourse_');
      const editedQuizTitle = `EditedQuiz_${courseCode}`;

      await csiTrainingPage.openCourseEditFromCard(courseTitle);
      await csiTrainingPage.fillCourseTitleInLanguageSection(editedCourseTitle);
      await csiTrainingPage.openLessonEditorFromEdit();
      await csiTrainingPage.updateQuizTitleOnly(editedQuizTitle);
      await csiTrainingPage.finishQuizLesson();
      await csiTrainingPage.submitCourseFormNextStep();
      await csiTrainingPage.publishCourse();
      await csiTrainingPage.searchCourseAndExpectTitleVisible(editedCourseTitle);
    });
  });

  test.describe('CSI_TEST user flows', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      const email = csiTestEmail();
      const password = csiTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(email, password);
      await csiLoginPage.expectOnHome();
    });

    test.describe('TR-025 Course report PDF export', () => {
      test('TR-025', async ({ csiTrainingPage }) => {
        await csiTrainingPage.openCourseReport();
        const pdf = await csiTrainingPage.downloadCourseReportPdf();

        expect(pdf.length, 'course report PDF should have bytes').toBeGreaterThan(512);
        const header = pdf.subarray(0, Math.min(8, pdf.length)).toString('latin1');
        expect(header.startsWith('%PDF'), 'download should be a PDF (starts with %PDF)').toBe(true);
      });
    });

    /**
     * TR-026: Super Admin views reports across orgs — selects two different
     * organisations on the Course Report page and downloads a PDF for each,
     * verifying that a valid PDF is produced per organisation. Org names are
     * held as local constants (not in env) per recorded-steps/Training/TR-026.txt.
     */
    test.describe('TR-026 super admin views reports across orgs', () => {
      test.describe.configure({ timeout: 360_000 });

      test('TR-026', async ({ csiTrainingPage }) => {
        // Org names stored as variables per TR-026.txt instruction (not in env file)
        const orgOne = 'Avotech';
        const orgTwo = 'Appnovation Tech';

        await csiTrainingPage.openCourseReport();

        // First org: select → wait for export to be ready → download
        await csiTrainingPage.selectOrgOnCourseReport(orgOne);
        const pdfOrgOne = await csiTrainingPage.downloadCourseReportPdf();

        expect(pdfOrgOne.length, `${orgOne} PDF should have bytes`).toBeGreaterThan(512);
        expect(
          pdfOrgOne.subarray(0, Math.min(8, pdfOrgOne.length)).toString('latin1').startsWith('%PDF'),
          `${orgOne} download should be a PDF`,
        ).toBe(true);

        // Second org: clear selector → select → wait for export → download
        await csiTrainingPage.clearOrgSelectorOnCourseReport();
        await csiTrainingPage.selectOrgOnCourseReport(orgTwo);
        const pdfOrgTwo = await csiTrainingPage.downloadCourseReportPdf();

        expect(pdfOrgTwo.length, `${orgTwo} PDF should have bytes`).toBeGreaterThan(512);
        expect(
          pdfOrgTwo.subarray(0, Math.min(8, pdfOrgTwo.length)).toString('latin1').startsWith('%PDF'),
          `${orgTwo} download should be a PDF`,
        ).toBe(true);
      });
    });

    /**
     * TR-011: retake failed course, complete video, intentionally fail quiz (recorded-steps/Training/TR-011.txt).
     */
    test.describe('TR-011 course retake and quiz failure', () => {
      test.describe.configure({ timeout: 600_000 });

      test('TR-011', async ({ csiTrainingPage }) => {
        await csiTrainingPage.runTr011RetakeAndFailFlow(csiTrainingFailRetakeCourseName());
      });
    });
  });

  /**
   * TR-010: passed course certificate preview and PDF download (recorded-steps/Training/TR-010.txt).
   */
  test.describe('TR-010 passed course certificate download', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TEST_PASSING_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_TEST_PASSING_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTestPassingUserTestEmail(),
        csiTestPassingUserTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-010', async ({ csiTrainingPage }) => {
      const pdf = await csiTrainingPage.downloadFirstPassedCourseCertificatePdf();

      expect(pdf.length, 'certificate PDF should have bytes').toBeGreaterThan(512);
      const header = pdf.subarray(0, Math.min(8, pdf.length)).toString('latin1');
      expect(header.startsWith('%PDF'), 'download should be a PDF (starts with %PDF)').toBe(true);
    });
  });

  /**
   * TR-022: auto-enrolled org user sees at least one course on My Course (recorded-steps/Training/TR-022.txt).
   */
  test.describe('TR-022 auto course assignment on My Course', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_AUTO_ENROLL_ORG_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_AUTO_ENROLL_ORG_USER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiAutoEnrollOrgUserTestEmail(),
        csiAutoEnrollOrgUserTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-022', async ({ csiTrainingPage }) => {
      await csiTrainingPage.expectTr022AutoAssignedCourseOnMyCourse();
    });
  });

  test.describe('TR-033 course dashboard manager view', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_ORG_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiOrgTestEmail(), csiOrgTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-033', async ({ csiTrainingPage }) => {
      await csiTrainingPage.openCourseDashboard();
      await csiTrainingPage.switchToManagerViewAndSettle();
      await csiTrainingPage.expectTr033ManagerDashboardSectionsVisible();
    });
  });

  /**
   * TR-020: User self-registers from library — finds the first course card
   * with a "Get Course" button (paginating if all visible courses are already
   * registered), clicks it, verifies the success modal, then confirms the
   * course appears on My Course → Ongoing (recorded-steps/Training/TR-020.txt).
   */
  test.describe('TR-020 user self-registers from library', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_USER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_USER_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiUserTestEmail(), csiUserTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-020', async ({ csiTrainingPage }) => {
      await csiTrainingPage.openCourseLibraryPage();
      const registeredCourseTitle = await csiTrainingPage.findAndClickGetCourseCourse();
      await csiTrainingPage.expectCourseRegistrationSuccessAndGoToMyCourse();
      await csiTrainingPage.clickOngoingTabAndExpectCourseTitle(registeredCourseTitle);
    });
  });

  /**
   * TR-024: Completed course re-assigned — logs in as CSI_USER_TEST_EMAIL to
   * capture a passed course title, then re-logs as CSI_SYSTEM_OWNER_TEST_EMAIL
   * to distribute that same course back to the user, then re-logs as the user
   * and verifies the course still appears with "Passed" on My Course
   * (recorded-steps/Training/TR-024.txt).
   */
  test.describe('TR-024 completed course re-assigned', () => {
    test.describe.configure({ timeout: 360_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_USER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_USER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiUserTestEmail(), csiUserTestPassword());
      await csiLoginPage.expectOnHome();
    });

    test('TR-024', async ({ csiLoginPage, csiTrainingPage }) => {
      // Phase 1: capture first passed course title from the user's My Course
      const passedCourseTitle =
        await csiTrainingPage.openMyCoursePassedTabAndCaptureFirstCourseTitle();

      // Phase 2: re-login as System Owner and distribute the same course back to the user
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      const distributionName = csiUniqueDistributionName();
      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.startNewDistribution();
      await csiTrainingPage.fillDistributionName(distributionName);

      // Single known course — type to filter the VirtualSelect dropdown instead of scrolling
      await csiTrainingPage.searchAndSelectDistributionCourseByTitle(passedCourseTitle);
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.pickTodayDistributionStartDate();

      // Target is the regular user, not the System Owner (unlike TR-002)
      await csiTrainingPage.searchUsersAndSelectRowByEmail(csiUserTestEmail(), csiUserTestEmail());
      await csiTrainingPage.checkOptionalNotifySwitch();
      await csiTrainingPage.goToNextWizardStep();
      await csiTrainingPage.submitDistribute();

      // Phase 3: re-login as user and verify the re-assigned course still shows "Passed"
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(csiUserTestEmail(), csiUserTestPassword());
      await csiLoginPage.expectOnHome();

      await csiTrainingPage.openMyCoursePassedTab();
      await csiTrainingPage.expectCourseOnPassedTabByTitle(passedCourseTitle);
    });
  });

  /**
   * TR-015: Training Admin sends manual reminder — opens the Distribution View,
   * enters the first distribution's detail via the row action menu, and sends a
   * reminder email to its users, asserting the success message
   * (recorded-steps/Training/TR-015.txt).
   */
  test.describe('TR-015 training admin sends manual reminder', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTpTrainingAdminTestEmail(),
        csiTpTrainingAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-015', async ({ csiTrainingPage }) => {
      await csiTrainingPage.openCourseDistributionViewTab();
      await csiTrainingPage.clickFirstDistributionRowActionAndViewDetail();
      await csiTrainingPage.sendManualReminderEmailAndExpectSuccess();
    });
  });

  /**
   * TR-017: Training Admin extends the schedule for missed users — the training admin
   * identifies a missed course on My Course, then CSI_TEST extends that distribution's
   * end date to the nearest allowed date, and finally the org user confirms the course
   * has moved back to Ongoing (recorded-steps/Training/TR-017.txt).
   */
  test.describe('TR-017 training admin extends for missed users', () => {
    test.describe.configure({ timeout: 360_000 });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_TP_TRAINING_ADMIN_TEST_PASSWORD?.length ||
        !process.env.CSI_TR017_MISSED_DISTRIBUTION_NAME?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTpTrainingAdminTestEmail(),
        csiTpTrainingAdminTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('TR-017', async ({ csiTrainingPage }) => {
      const courseOne = csiTr017MissedCourseOne();
      const courseTwo = csiTr017MissedCourseTwo();
      const distributionName = csiTr017MissedDistributionName();

      const currentMissedCourse = await csiTrainingPage.openMissedTabAndResolveCurrentMissedCourse(
        courseOne,
        courseTwo,
      );

      await csiTrainingPage.openCourseDistribution();
      await csiTrainingPage.searchDistributionAndOpenExtendSchedule(distributionName);
      await csiTrainingPage.expectExtendScheduleCoursesPresent(courseOne, courseTwo);
      await csiTrainingPage.extendCourseEndDateToEarliestAllowed(currentMissedCourse);

      await csiTrainingPage.openOngoingTabAndExpectCourse(currentMissedCourse);
    });
  });
});
