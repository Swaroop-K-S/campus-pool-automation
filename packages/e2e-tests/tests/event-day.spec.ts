import { test, expect } from '@playwright/test';

test.describe('Event Day Critical Path & Offline Resilience', () => {

  test.describe.configure({ mode: 'serial' }); // Run sequentially to preserve state if needed
  
  let driveId = 'mock_drive_123';
  let roomId = 'mock_room_456';
  const magicLinkUrl = `/invigilator/evaluate?room=${roomId}&token=mock_jwt_token`;

  test('Admin Orchestration: Create Drive and Start Drive', async ({ page }) => {
    // Navigate to admin login
    await page.goto('/login');
    await page.fill('input[placeholder="Email"]', 'admin@example.com');
    await page.fill('input[placeholder="Password"]', 'adminpassword');
    await page.click('button:has-text("Sign in")');

    // Wait for Dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Navigate to Create Drive
    await page.click('text=New Drive');
    await page.fill('input[name="companyName"]', 'Test E2E Company');
    await page.fill('input[name="jobRole"]', 'Software Engineer');
    await page.click('button:has-text("Create Drive")');
    
    // Start the drive
    await page.click('button:has-text("Start Drive")');
    await expect(page.locator('.status-badge')).toContainText('Active');
  });

  test('Student Hub: SOS Triage Call', async ({ page }) => {
    // Navigate to Student Welcome Hub
    await page.goto(`/welcome/${driveId}`);

    // Wait for room assignment simulation to settle
    await page.waitForTimeout(1000); 

    // Click SOS
    await page.click('button:has-text("SOS")');
    
    // Verify Triage Modal 
    await expect(page.locator('h3:has-text("Medical Emergency")')).toBeVisible();
    await page.click('button:has-text("Confirm Request")');
    
    // Verify State Updates
    await expect(page.locator('text=SOS Escalated')).toBeVisible();
  });

  test('Invigilator Magic Link: Score Submission', async ({ page }) => {
    // Access rubric dynamically via magic link
    await page.goto(magicLinkUrl);

    await expect(page.locator('h1')).toContainText('Evaluate Candidate');

    // Make selections on a mockup rubric
    // e.g. Technical Skills -> 5
    await page.locator('input[type="range"]').fill('5');
    await page.fill('textarea', 'Excellent candidate.');

    // Submit
    await page.click('button:has-text("Submit Final Score")');
    await expect(page.locator('text=Evaluation saved successfully')).toBeVisible();
  });

  test('Zero-Drop Offline Resilience: Rubric Submit & IDB Sync', async ({ context, page }) => {
    // Load Invigilator portal
    await page.goto(magicLinkUrl);
    await expect(page.locator('h1')).toContainText('Evaluate Candidate');

    // Fill form
    await page.fill('textarea', 'Offline test evaluation.');

    // Drop Network connection
    await context.setOffline(true);

    // Attempt Submit
    await page.click('button:has-text("Submit Final Score")');

    // UI should inform it is queued offline
    await expect(page.locator('text=You are offline')).toBeVisible();
    await expect(page.locator('text=Saved locally')).toBeVisible();

    // Restore Network connection
    await context.setOffline(false);

    // Observe autonomous retry triggering successful sync message
    await expect(page.locator('text=Synced successfully')).toBeVisible();
  });
});
