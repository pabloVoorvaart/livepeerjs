import React, { Component } from "react";
import styled from "styled-components";
import { VideoPlayer } from "@livepeer/chroma";
import LoadingOverlay from "../../components/LoadingOverlay";

export default class Failover extends Component {
  constructor(props) {
    super(props);
    this.state = { live: null };
  }
  render() {
    const { maxWidth = "100%", aspectRatio = "16:9" } = this.props;
    const { live } = this.state;
    const sources = [
      "https://cdn.livepeer.com/hls/2dc0d18iz3w1bjsr/index.m3u8",
      "https://cdn.livepeer.com/hls/ab0c6eiqq76lgto8/index.m3u8",
    ];
    return (
      <Media maxWidth={maxWidth}>
        <LoadingOverlay live={live} />
        <VideoPlayer
          autoPlay={true}
          poster=""
          sources={sources}
          aspectRatio={aspectRatio}
          onLive={() => {
            this.setState({ live: true });
          }}
          onDead={() => {
            this.setState({ live: false });
          }}
          ref={(ref) => {
            if (!ref) {
              return;
            }
            // Mux Data
            if (typeof window.mux !== "undefined") {
              window.mux.monitor(".video-react-video", {
                debug: true,
                data: {
                  env_key: process.env.REACT_APP_MUX_ENV_KEY,

                  // Metadata
                  player_name: "Media Player Embed",
                  player_init_time: Date.now(),
                  // video_id: this.props
                  // We can add other metadata here
                },
              });
            }
          }}
        />
      </Media>
    );
  }
}

const Media = styled.div`
  position: relative;
  display: block;
  width: 100%;
  max-width: ${({ maxWidth }) => (maxWidth ? maxWidth : "100%")};
  background: #000;
  overflow: hidden;
`;
