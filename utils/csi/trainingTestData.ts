import training from '../../data/csi/training.json';

/** Local part of the address, truncated at the first `.` (matches user-search field behavior). */
export function csiDistributionUserSearchToken(email: string): string {
  const local = email.split('@')[0] ?? '';
  const beforeDot = local.split('.')[0];
  return (beforeDot ?? local).trim();
}

export function csiUniqueDistributionName(
  prefix = training.courseDistribution.namePrefix,
): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${prefix}${Date.now()}_${worker}`;
}

export function csiTrainingFirstCourseName(): string {
  return training.courseDistribution.firstCourse;
}

export function csiTrainingSecondCourseName(): string {
  return training.courseDistribution.secondCourse;
}

/** TR-011: fixed retake course title (`CSI_TRAINING_FAIL_RETAKE_COURSE_NAME`; default Introduction to Cybersecurity). */
const TR011_DEFAULT_FAIL_RETAKE_COURSE_NAME = 'Introduction to Cybersecurity';

export function csiTrainingFailRetakeCourseName(): string {
  const name = process.env.CSI_TRAINING_FAIL_RETAKE_COURSE_NAME?.trim();
  return name && name.length > 0 ? name : TR011_DEFAULT_FAIL_RETAKE_COURSE_NAME;
}

export const TR011_COURSE_REGISTERED_MESSAGE = /Course registered\. Please/i;

export const TR011_QUIZ_FAILURE_MESSAGE = 'You have failed the course!' as const;

export const TR011_QUIZ_QUESTION_COUNT = 5;

export const TR011_VIDEO_PLAY_SETTLE_MS = 5_000;

export const TR011_VIDEO_AFTER_SEEK_SETTLE_MS = 5_000;

export const TR022_COURSE_CARD_INITIAL_WAIT_MS = 5_000;

export const TR022_MY_COURSE_TAB_SETTLE_MS = 5_000;
