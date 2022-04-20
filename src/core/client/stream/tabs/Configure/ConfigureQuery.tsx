import { Localized } from "@fluent/react/compat";
import { once } from "lodash";
import React, { FunctionComponent, Suspense } from "react";
import { graphql } from "react-relay";

import { QueryRenderData, QueryRenderer } from "coral-framework/lib/relay";
import { useStreamLocal } from "coral-stream/local/StreamLocal";
import { Delay, Spinner } from "coral-ui/components/v2";
import { QueryError } from "coral-ui/components/v3";

import { ConfigureQuery as QueryTypes } from "coral-stream/__generated__/ConfigureQuery.graphql";

const loadConfigureContainer = () =>
  import("./ConfigureContainer" /* webpackChunkName: "configure" */);

// (cvle) For some reason without `setTimeout` this request will block other requests.
const preload = once(() =>
  setTimeout(() => {
    void loadConfigureContainer();
  }, 0)
);

const LazyConfigureContainer = React.lazy(loadConfigureContainer);

export const render = ({ error, props }: QueryRenderData<QueryTypes>) => {
  if (error) {
    return <QueryError error={error} />;
  }

  preload();

  if (props) {
    if (!props.viewer) {
      return (
        <Localized id="configure-configureQuery-errorLoadingConfigure">
          <div>Error loading configure</div>
        </Localized>
      );
    }
    if (!props.story) {
      return (
        <Localized id="configure-configureQuery-storyNotFound">
          <div>Story not found</div>
        </Localized>
      );
    }
    return (
      <Suspense fallback={<Spinner />}>
        <LazyConfigureContainer
          viewer={props.viewer}
          story={props.story}
          settings={props.settings}
        />
      </Suspense>
    );
  }

  return (
    <Delay>
      <Spinner />
    </Delay>
  );
};

const ConfigureQuery: FunctionComponent = () => {
  const { storyID, storyURL } = useStreamLocal();

  return (
    <QueryRenderer<QueryTypes>
      query={graphql`
        query ConfigureQuery($storyID: ID, $storyURL: String) {
          story(id: $storyID, url: $storyURL) {
            ...ConfigureContainer_story
          }
          viewer {
            ...ConfigureContainer_viewer
          }
          settings {
            ...ConfigureContainer_settings
          }
        }
      `}
      variables={{
        storyID,
        storyURL,
      }}
      render={(data) => {
        return render(data);
      }}
    />
  );
};

export default ConfigureQuery;
