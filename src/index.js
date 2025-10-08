import api, { route, fetch } from '@forge/api';

export async function run(event) {
  const testPlanKey = event.issue.key;
  console.log(`🔧 Starting TestPlan automation for: ${testPlanKey}`);

  try {
    // Step 1: Get FixVersion from Test Plan
    const testPlanRes = await api.asApp().requestJira(route`/rest/api/3/issue/${testPlanKey}`);
    const testPlanData = await testPlanRes.json();
    const fixVersion = testPlanData.fields.fixVersions?.[0]?.name;

    if (!fixVersion) {
      console.log('⚠️ No FixVersion found on Test Plan');
      return 'No FixVersion found';
    }

    console.log(`📌 FixVersion: ${fixVersion}`);

    // Step 2: Find Stories with same FixVersion
    const jqlStories = `issuetype = Story AND fixVersion = "${fixVersion}"`;
    const storiesRes = await api.asApp().requestJira(route`/rest/api/3/search?jql=${encodeURIComponent(jqlStories)}&fields=issuelinks,labels`);
    const stories = (await storiesRes.json()).issues;

    console.log(`📚 Stories found: ${stories.length}`);

    // Step 3: Collect linked Test issue keys and Story labels
    const testKeys = new Set();
    const storyLabels = new Set();

    for (const story of stories) {
      const links = story.fields.issuelinks || [];
      for (const link of links) {
        const linked = link.outwardIssue || link.inwardIssue;
        if (linked?.fields?.issuetype?.name === "Test") {
          testKeys.add(linked.key);
        }
      }
      const labels = story.fields.labels || [];
      labels.forEach(label => storyLabels.add(label));
    }

    console.log(`🔗 Linked tests: ${testKeys.size}`);
    console.log(`🏷️ Story labels: ${Array.from(storyLabels).join(', ')}`);

    // Step 4: Find Tests with same FixVersion and label "Automated"
    const jqlAutomatedTests = `issuetype = Test AND fixVersion = "${fixVersion}" AND labels = "Automated"`;
    const automatedRes = await api.asApp().requestJira(route`/rest/api/3/search?jql=${encodeURIComponent(jqlAutomatedTests)}`);
    const automatedTests = (await automatedRes.json()).issues;
    automatedTests.forEach(test => testKeys.add(test.key));

    console.log(`🤖 Automated tests added: ${automatedTests.length}`);

    // Step 5: Find Tests with labels from Stories
    if (storyLabels.size > 0) {
      const labelQueries = Array.from(storyLabels).map(label => `labels = "${label}"`).join(" OR ");
      const jqlLabelTests = `issuetype = Test AND (${labelQueries})`;
      const labelRes = await api.asApp().requestJira(route`/rest/api/3/search?jql=${encodeURIComponent(jqlLabelTests)}`);
      const labelTests = (await labelRes.json()).issues;
      labelTests.forEach(test => testKeys.add(test.key));

      console.log(`🏷️ Label-based tests added: ${labelTests.length}`);
    }

    if (testKeys.size === 0) {
      console.log('🚫 No tests matched criteria');
      return 'No tests found to add';
    }

    // Step 6: Authenticate with Xray API using Forge secrets
    const clientId = (await api.getSecret('XRAY_CLIENT_ID'))?.value;
    const clientSecret = (await api.getSecret('XRAY_CLIENT_SECRET'))?.value;

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Xray credentials');
      return 'Missing Xray credentials';
    }

    const authRes = await fetch('https://xray.cloud.getxray.app/api/v2/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret })
    });

    const token = await authRes.text();
    console.log(`🔐 Xray token received`);

    // Step 7: Add Tests to Test Plan via Xray API
    const addRes = await fetch(`https://xray.cloud.getxray.app/api/v2/testplan/${testPlanKey}/tests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ add: Array.from(testKeys) })
    });

    console.log(`✅ Added ${testKeys.size} tests to ${testPlanKey}`);
    return `Added ${testKeys.size} tests to ${testPlanKey}`;
  } catch (error) {
    console.error('💥 Error during automation:', error);
    return 'Error occurred during TestPlan automation';
  }
}
