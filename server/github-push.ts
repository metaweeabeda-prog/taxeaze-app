import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function main() {
  try {
    const octokit = await getUncachableGitHubClient();
    
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    const repoName = 'taxeaze-app';
    
    try {
      const { data: existingRepo } = await octokit.repos.get({
        owner: user.login,
        repo: repoName
      });
      console.log(`Repository already exists: ${existingRepo.html_url}`);
      console.log(`\nYour code repository: ${existingRepo.html_url}`);
    } catch (e: any) {
      if (e.status === 404) {
        const { data: newRepo } = await octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description: 'TaXEaze - Receipt Management Application for Tax Preparation',
          private: false,
          auto_init: false
        });
        console.log(`Created new repository: ${newRepo.html_url}`);
        console.log(`\nYour code repository: ${newRepo.html_url}`);
      } else {
        throw e;
      }
    }
    
    console.log(`\nTo push your code, run these commands in the Shell:`);
    console.log(`git remote add github https://github.com/${user.login}/${repoName}.git`);
    console.log(`git push -u github main`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
