import path from 'path';

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

export function csiUniqueCourseTitle(prefix = 'TestCourse_'): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${prefix}${Date.now()}_${worker}`;
}

/** Course code max length is 45 chars; uses last 6 digits of timestamp to stay well within limit. */
export function csiUniqueCourseCode(): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `TC-${Date.now().toString().slice(-6)}_${worker}`;
}

/** Absolute path to the cover image used in TR-029 course creation. */
export const csiTr029CourseBgImagePath = path.resolve(
  __dirname,
  '../../data/csi/training/course-bg.png',
);
