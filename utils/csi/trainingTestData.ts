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
