/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  // Your code here
  app.log.info("Yay, the app was loaded!");

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    return context.octokit.issues.createComment(issueComment);
  });

  app.on(["pull_request.opened", "pull_request.edited", "pull_request.synchronize"], async (context) => {
    context.log("The PR was updated recently.");

    // const prUser = context.payload.issue.user.login;
    context.log(context.payload);
    if (context.isBot) {
      // Ignore update if this issue was created by the bot
      context.log("This push was created by the bot");
      context.log("Execution finished\n\n");
      return;
    }

    context.log("Reacted with -1");
    // const issueComment = context.issue({
    //   body: "Your PR was dismissed due to recent update/s.",
    // });
    // await context.octokit.issues.createComment(issueComment);

    // Add a requirement met confirmation to the comment
    context.octokit.reactions.createForIssueComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        comment_id: context.payload.comment.id,
        content: "+1"
    });
    context.log("Reacted with +1");
    
    //Approve the PR
    dismissPullRequest(context);
    context.log("PR dismissed");

  });

};


async function dismissPullRequest (context) {
  // Dismiss the PR
  const prParams = context.pullRequest({ event: 'DISMISS' })
  await context.octokit.pulls.createReview(prParams)
}
