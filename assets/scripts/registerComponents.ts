import { ComponentElement } from '@locomotivemtl/component-manager';
import { Accordion } from '@scripts/components/Accordion';
import { Carousel } from '@scripts/components/Carousel';
import { Header } from '@scripts/components/Header';
import { Form } from '@scripts/components/Form';
import { HeroHome } from '@scripts/components/HeroHome';
import { InlineVideo } from '@scripts/components/InlineVideo';
import { HoverVideo } from '@scripts/components/HoverVideo';
import { HeroVisual } from '@scripts/components/HeroVisual';
import { ModalFeature } from '@scripts/components/ModalFeature';
import { Timelapse } from '@scripts/components/Timelapse';
import { JobsListing } from '@scripts/components/JobsListing';
import { AbstractMask } from '@scripts/components/AbstractMask';
import { Sun } from '@scripts/components/Sun';
import { FadeinText } from '@scripts/components/FadeinText';
import { SmoothProgress } from '@scripts/components/SmoothProgress';
import { Customization } from '@scripts/components/Customization';
import { Aside } from '@scripts/components/Aside';
import { ModalSaveBuild } from '@scripts/components/ModalSaveBuild';
import { Rail } from '@scripts/components/Rail';
import { ParallaxImage } from '@scripts/components/ParallaxImage';
import { Tabs } from '@scripts/components/Tabs';
import { Switcher } from '@scripts/components/Switcher';
import Turntable from '@scripts/components/Turntable';
import Sequence from '@scripts/components/Sequence';
import TurntableExterior from '@scripts/components/TurntableExterior';
import TurntableInterior from '@scripts/components/TurntableInterior';
import Viewer from '@scripts/components/Viewer';
import { Markers } from '@scripts/components/Markers';
import { ModalVideo } from '@scripts/components/ModalVideo';
import { ProductList } from '@scripts/components/ProductList';

export default async function () {
    customElements.define('c-accordion', ComponentElement(Accordion, 'Accordion'));
    customElements.define('c-carousel', ComponentElement(Carousel, 'Carousel'));
    customElements.define('c-header', ComponentElement(Header, 'Header'));
    customElements.define('c-form', ComponentElement(Form, 'Form'));
    customElements.define('c-hero-home', ComponentElement(HeroHome, 'HeroHome'));
    customElements.define('c-timelapse', ComponentElement(Timelapse, 'Timelapse'));
    customElements.define('c-inline-video', ComponentElement(InlineVideo, 'InlineVideo'));
    customElements.define('c-hover-video', ComponentElement(HoverVideo, 'HoverVideo'));
    customElements.define('c-hero-visual', ComponentElement(HeroVisual, 'HeroVisual'));
    customElements.define('c-modal-feature', ComponentElement(ModalFeature, 'ModalFeature'));
    customElements.define('c-jobs-listing', ComponentElement(JobsListing, 'JobsListing'));
    customElements.define('c-abstract-mask', ComponentElement(AbstractMask, 'AbstractMask'));
    customElements.define('c-fadein-text', ComponentElement(FadeinText, 'FadeinText'));
    customElements.define('c-smooth-progress', ComponentElement(SmoothProgress, 'SmoothProgress'));
    customElements.define('c-customization', ComponentElement(Customization, 'Customization'));
    customElements.define('c-aside', ComponentElement(Aside, 'Aside'));
    customElements.define('c-modal-save-build', ComponentElement(ModalSaveBuild, 'ModalSaveBuild'));
    customElements.define('c-rail', ComponentElement(Rail, 'Rail'));
    customElements.define('c-parallax-image', ComponentElement(ParallaxImage, 'ParallaxImage'));
    customElements.define('c-tabs', ComponentElement(Tabs, 'Tabs'));
    customElements.define('c-switcher', ComponentElement(Switcher, 'Switcher'));
    customElements.define('c-turntable', ComponentElement(Turntable, 'Turntable'));
    customElements.define('c-sequence', ComponentElement(Sequence, 'Sequence'));
    customElements.define(
        'c-turntable-exterior',
        ComponentElement(TurntableExterior, 'TurntableExterior')
    );
    customElements.define(
        'c-turntable-interior',
        ComponentElement(TurntableInterior, 'TurntableInterior')
    );
    customElements.define('c-viewer', ComponentElement(Viewer, 'Viewer'));
    customElements.define('c-markers', ComponentElement(Markers, 'Markers'));
    customElements.define('c-modal-video', ComponentElement(ModalVideo, 'ModalVideo'));
    customElements.define('c-product-list', ComponentElement(ProductList, 'ProductList'));
}
