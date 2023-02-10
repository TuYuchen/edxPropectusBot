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
    // context.log(context.payload);
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

    //Approve the PR
    // dismissPullRequest(context);
    dismissReview(context);
    context.log("PR dismissed");

  });

};

const GITHUB_ACTIONS_LOGIN = "github-actions[bot]";

async function dismissPullRequest (context) {
  // Dismiss the PR
  // const prParams = context.pullRequest({ reviewers: ['influscopeTu']})
  // await context.octokit.pulls.requestReviewers(prParams)
  context.log(context)
  let allReviews = await context.octokit.pulls.listReviews(context.pullRequest());
  let reviewData = allReviews?.data;
  let ids = []
  if (reviewData?.length > 0) {
    for (let i = 0; i < reviewData.length; i++) {
      ids.push(reviewData[i].id)
      // const issueComment = context.issue({
      //   body: 'this is a test'+i,
      // });
      // await context.octokit.issues.createComment(issueComment);

      // await context.octokit.pulls.dismissReview(reviewParams)
    }
    let reviewParams = context.pullRequest({ review_id: ids[0] })
    await context.octokit.pulls.dismissReview(reviewParams)
    context.log(ids);
  }

}

async function approvePullRequest (context) {
  // Approve the PR
  const prParams = context.pullRequest({ event: 'APPROVE' })
  await context.octokit.pulls.createReview(prParams)
}

const getExistingReview = async (context) => {
  const reviews = await octokit.rest.pulls.listReviews({
      owner: context.payload.repository.owner,
      repo: context.payload.repository.repo,
      pull_number: context.payload.repository.number,
  });

  return reviews.data.find((review) => {
      return (review.user != null &&
          isGitHubActionUser(review.user.login) &&
          hasReviewedState(review.state));
  });
};

const isGitHubActionUser = (login) => {
  return login === GITHUB_ACTIONS_LOGIN;
};

const hasReviewedState = (state) => {
  return state === "CHANGES_REQUESTED" || state === "COMMENTED";
};

const dismissReview = async (context) => {
  context.log(`Trying to get existing review`);
  const review = await getExistingReview(context);
  if (review === undefined) {
      context.log("Found no existing review");
      return;
  }
  if (review.state === "COMMENTED") {
      await octokit.rest.pulls.updateReview({
          owner: context.payload.repository.owner,
          repo: context.payload.repository.repo,
          pull_number: context.payload.repository.number,
          review_id: review.id,
          body: 'Updated existing review',
      });
      context.log(`Updated existing review`);
  }
  else {
      await octokit.rest.pulls.dismissReview({
          owner: context.payload.repository.owner,
          repo: context.payload.repository.repo,
          pull_number: context.payload.repository.number,
          review_id: review.id,
          message: 'Dismissed existing review',
      });
      context.log(`Dismissed existing review`);
  }
};
