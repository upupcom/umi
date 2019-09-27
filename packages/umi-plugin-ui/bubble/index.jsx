import React from 'react';
import ReactDOM from 'react-dom';
import styled, { keyframes } from 'styled-components';
import isMobile from 'is-mobile';
import { callRemote, init as initSocket } from './socket';
import * as ENUM from './enum';
import Bubble from './Bubble';
import Loading from './Loading';
import Error from './Error';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
  }
`;

const fadeOutDown = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: translateY(50px);
  }
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  text-align: center;
  color: #fff;
  height: 100%;
`;

const IframeWrapper = styled('div')`
  position: absolute;
  z-index: 1001;
  bottom: 72px;
  right: 0;
  box-shadow: 0 4px 8px 0 rgba(13, 26, 38, 0.2);
  background: #23232d;
  width: 68vw;
  height: 80vh;
  display: ${props => (props.visible ? 'block' : 'none')};
  animation: ${props => (props.visible ? fadeInUp : fadeOutDown)} 400ms ease;
  opacity: ${props => (props.visible ? 1 : 0)};
  & > * {
    animation: ${props => (props.visible ? fadeInUp : fadeOutDown)} 400ms ease;
    opacity: ${props => (props.visible ? 1 : 0)};
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
  }
`;

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: undefined,
      connected: false,
      uiLoaded: false,
      errMsg: '',
      currentProject: props.currentProject,
    };
    window.addEventListener('message', this.handleMessage, false);
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handleMessage, false);
  }

  getMiniUrl = () => {
    const { port } = this.props;
    const { currentProject } = this.state;
    return `http://localhost:${port}/?mini${
      currentProject && currentProject.key ? `&key=${currentProject.key}` : ''
    }`;
  };

  handleMessage = event => {
    try {
      const { action, data } = JSON.parse(event.data);
      switch (action) {
        // 显示 mini
        case 'umi.ui.showMini': {
          this.setState({
            open: true,
          });
          break;
        }
        // 隐藏 mini
        case 'umi.ui.hideMini': {
          this.setState({
            open: false,
          });
          break;
        }
        default: {
        }
      }
    } catch (_) {}
    return false;
  };

  async componentDidMount() {
    const { port } = this.props;
    try {
      await initSocket(`http://localhost:${port}/umiui`, {
        onError: e => {
          this.setState({
            connected: false,
          });
        },
      });
      this.setState({
        connected: true,
      });
    } catch (e) {
      console.error('Init socket failed', e);
      this.setState({
        connected: false,
      });
    }
  }

  initUIService = async () => {
    const { currentProject, path } = this.props;
    console.log('currentProject', currentProject);
    if (this.state.connected) {
      // open iframe UmiUI
      if (!currentProject.key) {
        const res = await callRemote({
          type: '@@project/getKeyOrAddWithPath',
          payload: {
            path,
          },
        });
        this.setState({
          currentProject: res,
        });
      }
    }
  };

  closeModal = e => {
    e.stopPropagation();
    this.setState({
      open: false,
    });
  };

  onIframeLoad = () => {
    this.setState({
      uiLoaded: true,
    });
  };

  toggleMiniOpen = () => {
    if (typeof this.state.open === 'undefined') {
      this.initUIService();
    }
    this.setState(prevState => ({
      open: !prevState.open,
    }));
  };

  render() {
    const { open, currentProject, connected, uiLoaded, errMsg } = this.state;
    const { port, isBigfish = false } = this.props;
    const miniUrl = this.getMiniUrl();

    return (
      <Bubble isBigfish={isBigfish} toggleMiniOpen={this.toggleMiniOpen} open={open}>
        {open !== undefined && (
          <IframeWrapper visible={open}>
            {!uiLoaded && (
              <LoadingWrapper>
                <Loading />
                <p style={{ marginTop: 8 }}>加载中</p>
              </LoadingWrapper>
            )}
            {!connected ? (
              <Error isBigfish={isBigfish} />
            ) : (
              <iframe
                id="umi-ui-bubble"
                onLoad={this.onIframeLoad}
                style={{ width: '100%', height: '100%' }}
                // localhost maybe hard code
                src={miniUrl}
                frameBorder="0"
                scrolling="no"
                seamless="seamless"
                title="iframe_umi_ui"
              />
            )}
          </IframeWrapper>
        )}
      </Bubble>
    );
  }
}

const doc = window.document;
const node = doc.createElement('div');
doc.body.appendChild(node);

export default props => {
  if (!isMobile(navigator.userAgent)) {
    ReactDOM.render(<App {...props} />, node);
  }
};