/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  // Your code here
  app.log.info("The app was loaded!");

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    return context.octokit.issues.createComment(issueComment);
  });

  app.on(["pull_request.opened", "pull_request.edited", "pull_request.synchronize"], async (context) => {
    context.log("The PR was updated recently.");

    if (context.isBot) {
      // Ignore update if this issue was created by the bot
      context.log("This push was created by the bot");
      context.log("Execution finished\n\n");
      return;
    }

    // const issueComment = context.issue({
    //   body: "Your PR was dismissed due to recent update/s.",
    // });
    // await context.octokit.issues.createComment(issueComment);

    //Approve the PR
    dismissPullRequest(context);
    // dismissReview(context);

  });

};


async function dismissPullRequest (context) {
  // Dismiss the PR
  // const prParams = context.pullRequest({ reviewers: ['influscopeTu']})
  // await context.octokit.pulls.requestReviewers(prParams)
 
  let allReviews = await context.octokit.pulls.listReviews(context.pullRequest());
  let rowReviews = allReviews?.data;
  let reviewData = validateReviews(rowReviews)
  context.log(context, reviewData)
  let ids = []
  if (reviewData?.length > 0) {
    for (let i = 0; i < reviewData.length; i++) {
      ids.push(reviewData[i].id)
      await context.octokit.pulls.dismissReview({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: context.payload.number,
        review_id: reviewData[i].id,
        message: 'Dismissed reviews due to recent update',
      })
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

const validateReviews = async (context, reviews) => {
  context.log("The review is created by bot", reviews);
  return reviews.filter((review) => { review.role !==  "BOT"});
};



const hasReviewedState = (state) => {
  return state === "CHANGES_REQUESTED" || state === "COMMENTED";
};
