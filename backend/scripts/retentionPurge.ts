/**
 * HIPAA Retention Hard-Delete Script
 *
 * Hard-deletes soft-deleted patient records that are past the 6-year
 * HIPAA retention period (45 CFR § 164.530(j)).
 *
 * Run with: npx tsx backend/scripts/retentionPurge.ts
 * Designed to be scheduled as a cron job (e.g. weekly).
 */

import * as dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/lib/prisma';

const RETENTION_YEARS = 6;

async function main() {
  console.log('=== HIPAA Retention Purge ===');
  console.log(`Retention period: ${RETENTION_YEARS} years`);

  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - RETENTION_YEARS);

  console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
  console.log('Querying soft-deleted patients past retention period...');

  // Find patients that were soft-deleted more than 6 years ago
  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoffDate,
      },
    },
    select: { id: true, mrn: true, deletedAt: true },
  });

  if (patients.length === 0) {
    console.log('No patients eligible for purge.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${patients.length} patient(s) eligible for hard-delete.\n`);

  let totalPurged = 0;
  let totalRelatedDeleted = 0;

  for (const patient of patients) {
    console.log(`Purging patient ${patient.id} (MRN: ${patient.mrn}, deleted: ${patient.deletedAt?.toISOString()})...`);

    try {
      const result = await prisma.$transaction(async (tx) => {
        let relatedCount = 0;

        // Delete related records in dependency order
        const encounters = await tx.encounter.deleteMany({ where: { patientId: patient.id } });
        relatedCount += encounters.count;

        const observations = await tx.observation.deleteMany({ where: { patientId: patient.id } });
        relatedCount += observations.count;

        const orders = await tx.order.deleteMany({ where: { patientId: patient.id } });
        relatedCount += orders.count;

        const alerts = await tx.alert.deleteMany({ where: { patientId: patient.id } });
        relatedCount += alerts.count;

        const recommendations = await tx.recommendation.deleteMany({ where: { patientId: patient.id } });
        relatedCount += recommendations.count;

        const cqlResults = await tx.cQLResult.deleteMany({ where: { patientId: patient.id } });
        relatedCount += cqlResults.count;

        const therapyGaps = await tx.therapyGap.deleteMany({ where: { patientId: patient.id } });
        relatedCount += therapyGaps.count;

        const phenotypes = await tx.phenotype.deleteMany({ where: { patientId: patient.id } });
        relatedCount += phenotypes.count;

        const crossReferrals = await tx.crossReferral.deleteMany({ where: { patientId: patient.id } });
        relatedCount += crossReferrals.count;

        const drugTitrations = await tx.drugTitration.deleteMany({ where: { patientId: patient.id } });
        relatedCount += drugTitrations.count;

        const deviceEligibility = await tx.deviceEligibility.deleteMany({ where: { patientId: patient.id } });
        relatedCount += deviceEligibility.count;

        const riskScores = await tx.riskScoreAssessment.deleteMany({ where: { patientId: patient.id } });
        relatedCount += riskScores.count;

        const interventions = await tx.interventionTracking.deleteMany({ where: { patientId: patient.id } });
        relatedCount += interventions.count;

        const contraindications = await tx.contraindicationAssessment.deleteMany({ where: { patientId: patient.id } });
        relatedCount += contraindications.count;

        const medications = await tx.medication.deleteMany({ where: { patientId: patient.id } });
        relatedCount += medications.count;

        const conditions = await tx.condition.deleteMany({ where: { patientId: patient.id } });
        relatedCount += conditions.count;

        const carePlans = await tx.carePlan.deleteMany({ where: { patientId: patient.id } });
        relatedCount += carePlans.count;

        // Finally, delete the patient record itself
        await tx.patient.delete({ where: { id: patient.id } });

        return relatedCount;
      });

      totalPurged++;
      totalRelatedDeleted += result;
      console.log(`  -> Deleted patient + ${result} related records.`);
    } catch (err: any) {
      console.error(`  -> ERROR purging patient ${patient.id}: ${err.message}`);
    }
  }

  console.log('\n=== Purge Complete ===');
  console.log(`Patients purged: ${totalPurged}`);
  console.log(`Related records deleted: ${totalRelatedDeleted}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during retention purge:', err);
  prisma.$disconnect();
  process.exit(1);
});
