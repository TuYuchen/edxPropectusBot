/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  // Your code here
  app.log.info("The app was loaded!");

  // Self Approve method
  app.on(["issue_comment.created", "issue_comment.edited"], async (context) => { 
    if (context.isBot) {
      // Ignore comments if this issue was created by the bot=
      context.log("This comment was created by the bot");
      context.log("Execution finished\n\n");
      return;
    }
    
    if (!context.payload.issue.pull_request) {
      // Ignore comments if this issue is not a PR
      context.log("This comment is not created in a PR");
      context.log("Execution finished\n\n");
      return;
    }

    // Get the content of the comment
    const comment = context.payload.comment.body;
    context.log("Comment: " + comment);

    if (comment !== 'Self-Approve!') {
      // Ignore comments if this issue is not a PR
      context.log("Is not Force Merge!");
      context.log("Execution finished\n\n");
      return;
    }
    // Get the author of the PR and the comment
    const prUser = context.payload.issue.user.login;
    context.log("PR User: " + prUser);
    const reviewUser = context.payload.comment.user.login;
    context.log("Review User: " + reviewUser);
    // Check if they are the same user
    if (prUser !== reviewUser) {
      context.log("Not the same user");
      // If they are different users, tell the user that they are not allowed to self-approve this PR
      context.octokit.reactions.createForIssueComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        comment_id: context.payload.comment.id,
        content: "-1"
      });
      context.log("Reacted with -1");
      const issueComment = context.issue({
        body: "You are not allowed to self-approve others Pull Request!",
      });
      await context.octokit.issues.createComment(issueComment);
      context.log("Not allowed comment sent");
      context.log("Execution finished\n\n");
      return;
    }
    context.log("Same user");

   // Add a requirement met confirmation to the comment
   context.octokit.reactions.createForIssueComment({
     owner: context.payload.repository.owner.login,
     repo: context.payload.repository.name,
     comment_id: context.payload.comment.id,
     content: "+1"
   });
   context.log("Reacted with +1");

   //Approve the PR
   approvePullRequest(context);

  });

  app.on(["pull_request.opened", "pull_request.edited", "pull_request.synchronize"], async (context) => {
    context.log("The PR was updated recently.");
    // Stale reviews after any updates, exept bots. 
    if (context.isBot) {
      // Ignore update if this issue was created by the bot
      context.log("This push was created by the bot.");
      context.log("Execution finished\n\n");
      return;
    }
    dismissPullRequest(context);
  });

};

async function dismissPullRequest (context) {
  // Dismiss the PR
  let allReviews = await context.octokit.pulls.listReviews(context.pullRequest());
  let reviewData = allReviews?.data;

  let ids = []
  if (reviewData?.length > 0) {
    for (let i = 0; i < reviewData.length; i++) {
      ids.push(reviewData[i].id)
      if(reviewData[i].state === 'APPROVED') {
        await context.octokit.pulls.dismissReview({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          pull_number: context.payload.number,
          review_id: reviewData[i].id,
          message: 'Dismissed reviews due to recent update',
        })
      }
    }
    context.log(ids);
  } else {
    context.log("The review is created by bot");
  }

}

async function approvePullRequest (context) {
  // Approve the PR
  const prParams = context.pullRequest({ event: 'APPROVE' })
  await context.octokit.pulls.createReview(prParams)
}

// TODO: https://github.com/community/community/discussions/13836  [Feature Request] Allow github actions to bypass branch protection rules in certain specific circumstances
// https://github.com/orgs/community/discussions/25305 Allowing github-actions[bot] to push to protected branch
// This feature is still under discussion, I hope GitHub add the feature that let BOT skip the Branch Protection.
async function mergePullRequest (context) {
  // Merge the PR
  await context.octokit.pulls.merge({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    pull_number: context.payload.issue.number,
  })
  context.log("PR force merged!");
}
